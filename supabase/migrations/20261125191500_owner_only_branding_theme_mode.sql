CREATE OR REPLACE FUNCTION public.enforce_owner_branding_theme_mode()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
    AND get_company_role(auth.uid(), NEW.company_id) IS DISTINCT FROM 'owner'
  THEN
    IF TG_OP = 'INSERT' AND NEW.theme_mode IS DISTINCT FROM 'light' THEN
      RAISE EXCEPTION 'Only the company owner can set the theme mode';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.theme_mode IS DISTINCT FROM OLD.theme_mode THEN
      RAISE EXCEPTION 'Only the company owner can change the theme mode';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_owner_branding_theme_mode
BEFORE INSERT OR UPDATE ON public.company_branding
FOR EACH ROW
EXECUTE FUNCTION public.enforce_owner_branding_theme_mode();
