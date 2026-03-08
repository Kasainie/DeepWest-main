
CREATE OR REPLACE FUNCTION public.get_company_by_slug(_slug text)
RETURNS TABLE(id uuid, name text, logo_url text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.logo_url, c.slug
  FROM public.companies c
  WHERE c.slug = _slug AND c.is_paused = false
  LIMIT 1
$$;
