
-- Drop existing restrictive policies for company_staff
DROP POLICY IF EXISTS "Owner/admin can insert staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can update staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can delete staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can view all staff" ON public.company_staff;

-- Recreate with manager+ access
CREATE POLICY "Manager+ can insert staff" ON public.company_staff
  FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));

CREATE POLICY "Manager+ can update staff" ON public.company_staff
  FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));

CREATE POLICY "Manager+ can delete staff" ON public.company_staff
  FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));

CREATE POLICY "Manager+ can view all staff" ON public.company_staff
  FOR SELECT TO authenticated
  USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));
