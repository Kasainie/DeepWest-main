
-- Menu items for each company
CREATE TABLE public.menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'main',
  price numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  is_available boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view menu" ON public.menu_items FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert menu" ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update menu" ON public.menu_items FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can delete menu" ON public.menu_items FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Orders
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  order_number serial,
  table_number text,
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  tax numeric(10,2) NOT NULL DEFAULT 0,
  total numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  paid_at timestamptz
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view orders" ON public.orders FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can insert orders" ON public.orders FOR INSERT TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can update orders" ON public.orders FOR UPDATE TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Admin can delete orders" ON public.orders FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Order items
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric(10,2) NOT NULL DEFAULT 0,
  total_price numeric(10,2) NOT NULL DEFAULT 0,
  notes text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view order items" ON public.order_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND is_company_member(auth.uid(), o.company_id)));
CREATE POLICY "Staff+ can insert order items" ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND is_company_member(auth.uid(), o.company_id)));
CREATE POLICY "Staff+ can update order items" ON public.order_items FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND is_company_member(auth.uid(), o.company_id)));
CREATE POLICY "Admin can delete order items" ON public.order_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND get_company_role(auth.uid(), o.company_id) IN ('owner', 'admin')));

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Triggers
CREATE TRIGGER menu_items_updated_at BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
