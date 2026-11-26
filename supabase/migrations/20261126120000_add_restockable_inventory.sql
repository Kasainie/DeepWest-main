CREATE TABLE public.inventory_stock_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX inventory_stock_balances_company_item_uidx
  ON public.inventory_stock_balances (company_id, menu_item_id)
  WHERE menu_item_id IS NOT NULL;

CREATE TABLE public.inventory_restock_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  item_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  stock_date date NOT NULL DEFAULT ((now() AT TIME ZONE 'Africa/Nairobi')::date),
  restocked_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX inventory_restock_entries_company_date_idx
  ON public.inventory_restock_entries (company_id, stock_date);

ALTER TABLE public.inventory_stock_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_restock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view inventory stock"
  ON public.inventory_stock_balances FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE POLICY "Members can view inventory restocks"
  ON public.inventory_restock_entries FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

CREATE OR REPLACE FUNCTION public.is_kitchen_staff(_user_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_staff cs
    WHERE cs.user_id = _user_id
      AND cs.company_id = _company_id
      AND cs.is_active
      AND 'kitchen' = ANY(cs.department)
  );
$$;

REVOKE ALL ON FUNCTION public.is_kitchen_staff(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_kitchen_staff(uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Kitchen and managers can restock inventory"
  ON public.inventory_restock_entries FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND restocked_by = auth.uid()
    AND menu_item_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.menu_items mi
      WHERE mi.id = menu_item_id
        AND mi.company_id = inventory_restock_entries.company_id
    )
    AND (
      public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
      OR public.is_kitchen_staff(auth.uid(), company_id)
    )
  );

CREATE OR REPLACE FUNCTION public.apply_inventory_restock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.menu_item_id IS NULL THEN
    RAISE EXCEPTION 'A menu item is required to restock inventory';
  END IF;

  INSERT INTO public.inventory_stock_balances (company_id, menu_item_id, item_name, quantity)
  SELECT NEW.company_id, NEW.menu_item_id, mi.name, NEW.quantity
  FROM public.menu_items mi
  WHERE mi.id = NEW.menu_item_id AND mi.company_id = NEW.company_id
  ON CONFLICT (company_id, menu_item_id) WHERE menu_item_id IS NOT NULL
  DO UPDATE SET
    item_name = EXCLUDED.item_name,
    quantity = public.inventory_stock_balances.quantity + EXCLUDED.quantity,
    updated_at = now();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Menu item does not belong to this company';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_restock_updates_balance
  AFTER INSERT ON public.inventory_restock_entries
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_restock();

CREATE OR REPLACE FUNCTION public.consume_inventory_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_available integer;
BEGIN
  IF NEW.menu_item_id IS NULL OR NEW.quantity <= 0 THEN
    RAISE EXCEPTION 'A valid menu item and quantity are required';
  END IF;

  SELECT o.company_id INTO v_company_id
  FROM public.orders o
  WHERE o.id = NEW.order_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Order does not exist';
  END IF;

  SELECT b.quantity INTO v_available
  FROM public.inventory_stock_balances b
  WHERE b.company_id = v_company_id AND b.menu_item_id = NEW.menu_item_id
  FOR UPDATE;

  IF NOT FOUND OR v_available < NEW.quantity THEN
    RAISE EXCEPTION 'Not enough stock for %. Available: %. Restock this item before ordering.',
      NEW.name, COALESCE(v_available, 0)
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.inventory_stock_balances
  SET quantity = quantity - NEW.quantity, updated_at = now()
  WHERE company_id = v_company_id AND menu_item_id = NEW.menu_item_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER order_items_consume_inventory
  BEFORE INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.consume_inventory_stock();

CREATE OR REPLACE FUNCTION public.restore_inventory_for_order(_order_id uuid, _company_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.inventory_stock_balances (company_id, menu_item_id, item_name, quantity)
  SELECT _company_id, oi.menu_item_id, MAX(oi.name), SUM(oi.quantity)::integer
  FROM public.order_items oi
  WHERE oi.order_id = _order_id AND oi.menu_item_id IS NOT NULL
  GROUP BY oi.menu_item_id
  ON CONFLICT (company_id, menu_item_id) WHERE menu_item_id IS NOT NULL
  DO UPDATE SET
    item_name = EXCLUDED.item_name,
    quantity = public.inventory_stock_balances.quantity + EXCLUDED.quantity,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_inventory_on_order_cancel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    PERFORM public.restore_inventory_for_order(NEW.id, NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_restore_inventory_on_cancel
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_inventory_on_order_cancel();

CREATE OR REPLACE FUNCTION public.restore_inventory_before_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status NOT IN ('served', 'completed', 'cancelled') THEN
    PERFORM public.restore_inventory_for_order(OLD.id, OLD.company_id);
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER orders_restore_inventory_before_delete
  BEFORE DELETE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.restore_inventory_before_order_delete();

CREATE OR REPLACE FUNCTION public.create_restaurant_order(
  _company_id uuid,
  _table_number text,
  _notes text,
  _items jsonb
)
RETURNS TABLE (id uuid, order_number integer)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_item jsonb;
  v_menu_item_id uuid;
  v_quantity integer;
  v_item_name text;
  v_unit_price numeric(10, 2);
  v_subtotal numeric(10, 2) := 0;
  v_order_id uuid;
  v_order_number integer;
BEGIN
  IF NOT public.is_company_member(auth.uid(), _company_id) THEN
    RAISE EXCEPTION 'You do not have access to this company';
  END IF;

  IF _items IS NULL OR jsonb_typeof(_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Order items must be provided as a list';
  END IF;

  IF jsonb_array_length(_items) = 0 THEN
    RAISE EXCEPTION 'An order must contain at least one item';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    IF v_menu_item_id IS NULL OR v_quantity IS NULL OR v_quantity <= 0 THEN
      RAISE EXCEPTION 'Each order item must have a valid menu item and quantity';
    END IF;

    SELECT mi.name, mi.price INTO v_item_name, v_unit_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND mi.company_id = _company_id
      AND mi.is_available;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'A selected menu item is no longer available';
    END IF;

    v_subtotal := v_subtotal + (v_unit_price * v_quantity);
  END LOOP;

  INSERT INTO public.orders (
    company_id, table_number, subtotal, tax, total, notes, created_by, status
  )
  VALUES (
    _company_id, _table_number, v_subtotal, 0, v_subtotal,
    NULLIF(_notes, ''), auth.uid(), 'pending'
  )
  RETURNING public.orders.id, public.orders.order_number
  INTO v_order_id, v_order_number;

  FOR v_item IN SELECT value FROM jsonb_array_elements(_items)
  LOOP
    v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    v_quantity := (v_item ->> 'quantity')::integer;

    SELECT mi.name, mi.price INTO v_item_name, v_unit_price
    FROM public.menu_items mi
    WHERE mi.id = v_menu_item_id
      AND mi.company_id = _company_id
      AND mi.is_available;

    INSERT INTO public.order_items (
      order_id, menu_item_id, name, quantity, unit_price, total_price, notes
    )
    VALUES (
      v_order_id, v_menu_item_id, v_item_name, v_quantity, v_unit_price,
      v_unit_price * v_quantity, NULLIF(v_item ->> 'notes', '')
    );
  END LOOP;

  RETURN QUERY SELECT v_order_id, v_order_number;
END;
$$;

REVOKE ALL ON FUNCTION public.create_restaurant_order(uuid, text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_restaurant_order(uuid, text, text, jsonb) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory_stock_balances;
