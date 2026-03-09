
-- Trigger to prevent users from self-approving by blocking is_approved changes
-- Only the service role (used by edge functions) can modify is_approved
CREATE OR REPLACE FUNCTION public.protect_is_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    IF current_setting('role') != 'service_role' THEN
      NEW.is_approved := OLD.is_approved;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER protect_is_approved_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_is_approved();
