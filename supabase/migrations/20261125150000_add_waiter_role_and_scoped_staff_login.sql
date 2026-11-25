DROP FUNCTION IF EXISTS public.lookup_staff_by_code(text);

CREATE FUNCTION public.lookup_staff_by_code(
  _staff_code text,
  _company_slug text DEFAULT NULL
)
RETURNS TABLE(
  staff_id uuid,
  company_id uuid,
  full_name text,
  department text,
  role text,
  company_name text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    cs.id,
    cs.company_id,
    cs.full_name,
    cs.department[1],
    cs.role,
    c.name,
    cs.is_active
  FROM public.company_staff cs
  JOIN public.companies c ON c.id = cs.company_id
  WHERE upper(regexp_replace(cs.staff_code, '\s', '', 'g')) =
        upper(regexp_replace(_staff_code, '\s', '', 'g'))
    AND (_company_slug IS NULL OR c.slug = _company_slug)
$$;

REVOKE ALL ON FUNCTION public.lookup_staff_by_code(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_staff_by_code(text, text) TO service_role;
