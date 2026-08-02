CREATE OR REPLACE FUNCTION public.lookup_staff_by_code(_staff_code text)
RETURNS TABLE(staff_id uuid, company_id uuid, full_name text, department text, role text, company_name text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.id as staff_id,
    cs.company_id,
    cs.full_name,
    cs.department[1] as department,
    cs.role,
    c.name as company_name,
    cs.is_active
  FROM public.company_staff cs
  JOIN public.companies c ON c.id = cs.company_id
  WHERE upper(regexp_replace(cs.staff_code, '\s', '', 'g')) = upper(regexp_replace(_staff_code, '\s', '', 'g'))
  LIMIT 1
$$;