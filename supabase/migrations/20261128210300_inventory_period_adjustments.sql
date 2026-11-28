CREATE TABLE IF NOT EXISTS public.inventory_period_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  item_name text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  initial_quantity integer NOT NULL CHECK (initial_quantity >= 0),
  restocked_adjustment integer NOT NULL DEFAULT 0,
  CHECK (period_start <= period_end),
  UNIQUE (company_id, item_key, period_start, period_end)
);

ALTER TABLE public.inventory_period_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view inventory period adjustments"
  ON public.inventory_period_adjustments;
CREATE POLICY "Members can view inventory period adjustments"
  ON public.inventory_period_adjustments FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));

DROP POLICY IF EXISTS "Owner admin and manager can insert inventory period adjustments"
  ON public.inventory_period_adjustments;
CREATE POLICY "Owner admin and manager can insert inventory period adjustments"
  ON public.inventory_period_adjustments FOR INSERT TO authenticated
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Owner admin and manager can update inventory period adjustments"
  ON public.inventory_period_adjustments;
CREATE POLICY "Owner admin and manager can update inventory period adjustments"
  ON public.inventory_period_adjustments FOR UPDATE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  )
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );

DROP POLICY IF EXISTS "Owner admin and manager can delete inventory period adjustments"
  ON public.inventory_period_adjustments;
CREATE POLICY "Owner admin and manager can delete inventory period adjustments"
  ON public.inventory_period_adjustments FOR DELETE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
  );
