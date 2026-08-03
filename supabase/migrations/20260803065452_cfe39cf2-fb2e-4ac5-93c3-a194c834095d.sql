CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.company_staff ADD COLUMN IF NOT EXISTS password_hash text;

REVOKE ALL (password_hash) ON public.company_staff FROM authenticated, anon;

CREATE OR REPLACE FUNCTION public.set_staff_password(_staff_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_company uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _password IS NULL OR length(_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT company_id INTO v_company FROM public.company_staff WHERE id = _staff_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;

  IF public.role_rank(public.get_company_role(auth.uid(), v_company)) < 2 THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.company_staff
  SET password_hash = extensions.crypt(_password, extensions.gen_salt('bf', 10)), updated_at = now()
  WHERE id = _staff_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.verify_staff_password(_staff_id uuid, _password text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_staff
    WHERE id = _staff_id
      AND password_hash IS NOT NULL
      AND password_hash = extensions.crypt(_password, password_hash)
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_has_password(_staff_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT password_hash IS NOT NULL FROM public.company_staff WHERE id = _staff_id), false);
$$;

REVOKE ALL ON FUNCTION public.verify_staff_password(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_staff_password(uuid, text) TO service_role;
REVOKE ALL ON FUNCTION public.staff_has_password(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_has_password(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.set_staff_password(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_staff_password(uuid, text) TO authenticated, service_role;