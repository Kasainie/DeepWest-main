
-- Allow managers to create/view/update/delete invitations
DROP POLICY IF EXISTS "Owner/admin can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owner/admin can view all invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owner/admin can update invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owner/admin can delete invitations" ON public.company_invitations;

CREATE POLICY "Manager+ can create invitations" ON public.company_invitations
  FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));

CREATE POLICY "Manager+ can view all invitations" ON public.company_invitations
  FOR SELECT TO authenticated
  USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));

CREATE POLICY "Manager+ can update invitations" ON public.company_invitations
  FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));

CREATE POLICY "Manager+ can delete invitations" ON public.company_invitations
  FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner'::text, 'admin'::text, 'manager'::text]));
