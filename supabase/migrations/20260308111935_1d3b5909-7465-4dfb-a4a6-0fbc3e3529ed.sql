
-- Notify when order status changes to ready
CREATE OR REPLACE FUNCTION public.notify_order_ready()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'ready' AND OLD.status IS DISTINCT FROM 'ready' THEN
    INSERT INTO public.notifications (company_id, title, message, type)
    VALUES (
      NEW.company_id,
      'Order #' || NEW.order_number || ' Ready',
      'Order #' || NEW.order_number || COALESCE(' (Table ' || NEW.table_number || ')', '') || ' is ready for serving.',
      'order'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Notify when payment is completed
CREATE OR REPLACE FUNCTION public.notify_payment_completed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    INSERT INTO public.notifications (company_id, title, message, type)
    VALUES (
      NEW.company_id,
      'Payment Received – Order #' || NEW.order_number,
      'Order #' || NEW.order_number || ' paid via ' || COALESCE(NEW.payment_method, 'unknown') || '. Total: ' || NEW.total,
      'order'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_order_ready
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_ready();

CREATE TRIGGER on_payment_completed
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_payment_completed();
