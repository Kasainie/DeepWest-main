CREATE TABLE public.bar_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'spirit',
  stock numeric NOT NULL DEFAULT 0,
  unit text NOT NULL DEFAULT 'bottles',
  low_threshold numeric NOT NULL DEFAULT 5,
  cost_per_unit numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bar_inventory ENABLE ROW LEVEL SECURITY;

-- Members can view inventory
CREATE POLICY "Members can view bar inventory" ON public.bar_inventory
FOR SELECT TO authenticated
USING (is_company_member(auth.uid(), company_id));

-- Manager+ can insert inventory
CREATE POLICY "Manager+ can insert bar inventory" ON public.bar_inventory
FOR INSERT TO authenticated
WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));

-- Manager+ can update inventory
CREATE POLICY "Manager+ can update bar inventory" ON public.bar_inventory
FOR UPDATE TO authenticated
USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));

-- Owner/admin can delete inventory
CREATE POLICY "Owner/admin can delete bar inventory" ON public.bar_inventory
FOR DELETE TO authenticated
USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_bar_inventory_updated_at
  BEFORE UPDATE ON public.bar_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();