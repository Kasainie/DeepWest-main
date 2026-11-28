ALTER TABLE public.inventory_stock_balances
  ADD COLUMN IF NOT EXISTS initial_quantity integer;

UPDATE public.inventory_stock_balances
SET initial_quantity = quantity
WHERE initial_quantity IS NULL;

ALTER TABLE public.inventory_stock_balances
  ALTER COLUMN initial_quantity SET DEFAULT 0,
  ALTER COLUMN initial_quantity SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'inventory_stock_balances_initial_quantity_check'
      AND conrelid = 'public.inventory_stock_balances'::regclass
  ) THEN
    ALTER TABLE public.inventory_stock_balances
      ADD CONSTRAINT inventory_stock_balances_initial_quantity_check
      CHECK (initial_quantity >= 0);
  END IF;
END;
$$;

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

  INSERT INTO public.inventory_stock_balances (
    company_id,
    menu_item_id,
    item_name,
    initial_quantity,
    quantity
  )
  SELECT NEW.company_id, NEW.menu_item_id, mi.name, 0, NEW.quantity
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

DROP TRIGGER IF EXISTS inventory_restock_updates_balance
  ON public.inventory_restock_entries;

CREATE TRIGGER inventory_restock_updates_balance
  AFTER INSERT ON public.inventory_restock_entries
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_restock();
