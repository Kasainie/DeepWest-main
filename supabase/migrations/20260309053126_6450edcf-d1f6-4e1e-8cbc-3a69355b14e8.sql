
-- Fix 1: Replace overly permissive "Anyone can read invitation by token" policy
DROP POLICY IF EXISTS "Anyone can read invitation by token" ON public.company_invitations;

CREATE POLICY "User can read own invitation by token"
  ON public.company_invitations FOR SELECT
  TO authenticated
  USING (
    is_company_member(auth.uid(), company_id)
    OR email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Fix 2: Replace self-join policy on company_members
DROP POLICY IF EXISTS "Owner/admin or first member can insert" ON public.company_members;

CREATE POLICY "Owner/admin or invited user can insert"
  ON public.company_members FOR INSERT TO authenticated
  WITH CHECK (
    get_company_role(auth.uid(), company_id) IN ('owner', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.company_invitations ci
      WHERE ci.company_id = company_members.company_id
        AND ci.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND ci.status = 'pending'
        AND ci.expires_at > now()
        AND company_members.user_id = auth.uid()
        AND company_members.role = ci.role
    )
  );
