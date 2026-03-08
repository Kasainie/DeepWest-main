
CREATE OR REPLACE FUNCTION public.notify_conference_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type)
  VALUES (
    NEW.company_id,
    'New Conference Booking',
    NEW.event_name || ' booked for ' || TO_CHAR(NEW.event_date, 'Mon DD') || COALESCE(' · ' || NEW.attendees || ' attendees', '') || '. Amount: ' || NEW.amount,
    'booking'
  );
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_conference_booking_created
  AFTER INSERT ON public.conference_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_conference_booking();

CREATE OR REPLACE FUNCTION public.notify_conference_booking_cancelled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.notifications (company_id, title, message, type)
    VALUES (
      NEW.company_id,
      'Conference Booking Cancelled',
      NEW.event_name || ' (' || TO_CHAR(NEW.event_date, 'Mon DD') || ') has been cancelled.',
      'warning'
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER on_conference_booking_cancelled
  AFTER UPDATE ON public.conference_bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_conference_booking_cancelled();
