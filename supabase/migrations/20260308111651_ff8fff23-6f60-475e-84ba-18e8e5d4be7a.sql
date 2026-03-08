
-- Function to create notification on new order
CREATE OR REPLACE FUNCTION public.notify_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type)
  VALUES (
    NEW.company_id,
    'New Order #' || NEW.order_number,
    'A new order has been placed' || COALESCE(' for table ' || NEW.table_number, '') || '. Total: ' || NEW.total,
    'order'
  );
  RETURN NEW;
END;
$function$;

-- Function to create notification on new booking
CREATE OR REPLACE FUNCTION public.notify_new_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type)
  VALUES (
    NEW.company_id,
    'New ' || INITCAP(NEW.booking_type) || ' Booking',
    'A new ' || NEW.booking_type || ' booking has been created. Amount: ' || NEW.amount,
    'booking'
  );
  RETURN NEW;
END;
$function$;

-- Function to create notification on new staff
CREATE OR REPLACE FUNCTION public.notify_new_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type)
  VALUES (
    NEW.company_id,
    'New Staff Member',
    NEW.full_name || ' has been added as ' || NEW.role || ' (' || array_to_string(NEW.department, ', ') || ')',
    'staff'
  );
  RETURN NEW;
END;
$function$;

-- Create triggers
CREATE TRIGGER on_new_order
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();

CREATE TRIGGER on_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_booking();

CREATE TRIGGER on_new_staff
  AFTER INSERT ON public.company_staff
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_staff();
