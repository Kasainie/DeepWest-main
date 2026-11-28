DROP POLICY IF EXISTS "Owner admin and manager can update inventory stock" ON public.inventory_stock_balances;
DROP POLICY IF EXISTS "Owner admin and manager can delete inventory stock" ON public.inventory_stock_balances;

CREATE POLICY "Owner admin and manager can update inventory stock"
  ON public.inventory_stock_balances FOR UPDATE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  )
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

CREATE POLICY "Owner admin and manager can delete inventory stock"
  ON public.inventory_stock_balances FOR DELETE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Managers and menu staff can delete menu" ON public.menu_items;

CREATE POLICY "Owner admin and manager can delete inventory items"
  ON public.menu_items FOR DELETE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Managers and menu staff can update menu" ON public.menu_items;

CREATE POLICY "Owner admin and manager can update menu"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  )
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );
