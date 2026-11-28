DROP POLICY IF EXISTS "Owner admin and manager can update inventory stock" ON public.inventory_stock_balances;
CREATE POLICY "Owner admin and manager can update inventory stock"
  ON public.inventory_stock_balances FOR UPDATE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  )
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Owner admin and manager can delete inventory stock" ON public.inventory_stock_balances;
CREATE POLICY "Owner admin and manager can delete inventory stock"
  ON public.inventory_stock_balances FOR DELETE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Owner admin and manager can insert inventory stock" ON public.inventory_stock_balances;
CREATE POLICY "Owner admin and manager can insert inventory stock"
  ON public.inventory_stock_balances FOR INSERT TO authenticated
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Owner admin and manager can delete inventory restocks" ON public.inventory_restock_entries;
CREATE POLICY "Owner admin and manager can delete inventory restocks"
  ON public.inventory_restock_entries FOR DELETE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );
