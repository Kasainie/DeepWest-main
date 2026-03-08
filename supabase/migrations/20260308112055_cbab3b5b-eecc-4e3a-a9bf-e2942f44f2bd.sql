
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'checked_in' AND OLD.status IS DISTINCT FROM 'checked_in' THEN
    INSERT INTO public.notifications (company_id, title, message, type)
    VALUES (
      NEW.company_id,
      'Guest Checked In',
      'A ' || NEW.booking_type || ' booking has been checked in. Amount: ' || NEW.amount,
      'booking'
    );
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.notifications (company_id, title, message, type)
    VALUES (
      NEW.company_id,
      'Booking Cancelled',
      'A ' || NEW.booking_type || ' booking (Amount: ' || NEW.amount || ') has been cancelled.',
      'warning'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_booking_status_change
  AFTER UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_booking_status_change();
