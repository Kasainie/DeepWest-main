
DROP POLICY "Owner/admin can insert members" ON public.company_members;

CREATE POLICY "Owner/admin or first member can insert"
ON public.company_members FOR INSERT TO authenticated
WITH CHECK (
  get_company_role(auth.uid(), company_id) IN ('owner', 'admin')
  OR user_id = auth.uid()
);
