
-- Drop the existing permissive SELECT policy that exposes staff_code to all members
DROP POLICY IF EXISTS "Members can view company staff" ON public.company_staff;

-- Create a new SELECT policy: only owner/admin can see all staff (including staff_code)
CREATE POLICY "Owner/admin can view all staff"
  ON public.company_staff FOR SELECT TO authenticated
  USING (
    get_company_role(auth.uid(), company_id) IN ('owner', 'admin')
  );

-- The existing "Staff can view own record by user_id" policy stays, allowing staff to see their own record

-- Create a security-definer function that returns staff list WITHOUT staff_code
-- This allows regular members to list staff names/roles without seeing codes
CREATE OR REPLACE FUNCTION public.list_company_staff(_company_id uuid)
RETURNS TABLE (
  id uuid,
  company_id uuid,
  user_id uuid,
  full_name text,
  role text,
  department text[],
  phone text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.id, cs.company_id, cs.user_id, cs.full_name, cs.role, 
    cs.department, cs.phone, cs.is_active, cs.created_at, cs.updated_at
  FROM public.company_staff cs
  WHERE cs.company_id = _company_id
    AND is_company_member(auth.uid(), _company_id)
$$;
