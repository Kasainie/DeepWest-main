
-- Add unique constraint for company_members upsert
ALTER TABLE public.company_members ADD CONSTRAINT company_members_company_user_unique UNIQUE(company_id, user_id);

-- Allow the staff-login edge function to also look up staff without being authenticated
-- by making lookup_staff_by_code accessible
CREATE POLICY "Staff can view own record by user_id"
  ON public.company_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid());
