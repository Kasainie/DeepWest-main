CREATE OR REPLACE FUNCTION public.prevent_waiter_order_payment_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND (
       NEW.payment_status IS DISTINCT FROM OLD.payment_status
       OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
       OR NEW.paid_at IS DISTINCT FROM OLD.paid_at
     )
     AND EXISTS (
       SELECT 1
       FROM public.company_staff
       WHERE company_id = OLD.company_id
         AND user_id = auth.uid()
         AND lower(role) = 'waiter'
     ) THEN
    RAISE EXCEPTION 'Waiters cannot record order payments'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_waiter_order_payment_updates ON public.orders;
CREATE TRIGGER prevent_waiter_order_payment_updates
  BEFORE UPDATE OF payment_status, payment_method, paid_at ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_waiter_order_payment_updates();
