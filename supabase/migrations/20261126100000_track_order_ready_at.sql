ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ready_at timestamptz;

UPDATE public.orders
SET ready_at = completed_at
WHERE status = 'ready'
  AND ready_at IS NULL
  AND completed_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_order_ready_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'ready' AND OLD.status IS DISTINCT FROM 'ready' THEN
    NEW.ready_at := COALESCE(NEW.ready_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_order_ready_at ON public.orders;

CREATE TRIGGER trg_set_order_ready_at
BEFORE UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_ready_at();
