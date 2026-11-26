ALTER TABLE public.orders
  ADD COLUMN served_by_user_id uuid,
  ADD COLUMN served_by_name text;

CREATE OR REPLACE FUNCTION public.capture_order_served_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_user_id uuid;
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'served' THEN
      NEW.served_by_user_id := NULL;
      NEW.served_by_name := NULL;
      RETURN NEW;
    END IF;
  ELSE
    IF NEW.status IS DISTINCT FROM 'served'
      OR OLD.status = 'served' THEN
      IF NEW.served_by_user_id IS DISTINCT FROM OLD.served_by_user_id
        OR NEW.served_by_name IS DISTINCT FROM OLD.served_by_name THEN
        RAISE EXCEPTION 'Serving attribution is managed automatically';
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'An authenticated user is required to mark an order as served';
  END IF;

  SELECT NULLIF(btrim(cs.full_name), '')
  INTO v_name
  FROM public.company_staff cs
  WHERE cs.company_id = NEW.company_id
    AND cs.user_id = v_user_id
    AND cs.is_active
  LIMIT 1;

  NEW.served_by_user_id := v_user_id;
  NEW.served_by_name := COALESCE(
    v_name,
    NULLIF(btrim(auth.jwt() -> 'user_metadata' ->> 'full_name'), ''),
    NULLIF(auth.jwt() ->> 'email', '')
  );

  IF NEW.served_by_name IS NULL THEN
    RAISE EXCEPTION 'A display name is required to mark an order as served';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_capture_served_by
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.capture_order_served_by();
