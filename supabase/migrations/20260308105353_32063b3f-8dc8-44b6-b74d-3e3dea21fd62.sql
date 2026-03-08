
-- Drop old default first
ALTER TABLE public.company_staff ALTER COLUMN department DROP DEFAULT;

-- Change department from text to text[] (array)
ALTER TABLE public.company_staff 
  ALTER COLUMN department SET DATA TYPE text[] 
  USING ARRAY[department];

-- Set new default
ALTER TABLE public.company_staff 
  ALTER COLUMN department SET DEFAULT ARRAY['hotel']::text[];

-- Update the lookup_staff_by_code function to return first department for backward compat
CREATE OR REPLACE FUNCTION public.lookup_staff_by_code(_staff_code text)
 RETURNS TABLE(staff_id uuid, company_id uuid, full_name text, department text, role text, company_name text, is_active boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  WHERE cs.staff_code = _staff_code
  LIMIT 1
$function$;
