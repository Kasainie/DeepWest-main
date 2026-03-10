
-- Add department column to notifications
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS department text;

-- Update existing notification triggers to include department

-- Drop and recreate notify_new_order
CREATE OR REPLACE FUNCTION public.notify_new_order()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type, department)
  VALUES (
    NEW.company_id,
    'New Order #' || NEW.order_number,
    'A new order has been placed' || COALESCE(' for table ' || NEW.table_number, '') || '. Total: ' || NEW.total,
    'order',
    'restaurant'
  );
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_order_ready
CREATE OR REPLACE FUNCTION public.notify_order_ready()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'ready' AND OLD.status IS DISTINCT FROM 'ready' THEN
    INSERT INTO public.notifications (company_id, title, message, type, department)
    VALUES (
      NEW.company_id,
      'Order #' || NEW.order_number || ' Ready',
      'Order #' || NEW.order_number || COALESCE(' (Table ' || NEW.table_number || ')', '') || ' is ready for serving.',
      'order',
      'restaurant'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_payment_completed
CREATE OR REPLACE FUNCTION public.notify_payment_completed()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    INSERT INTO public.notifications (company_id, title, message, type, department)
    VALUES (
      NEW.company_id,
      'Payment Received – Order #' || NEW.order_number,
      'Order #' || NEW.order_number || ' paid via ' || COALESCE(NEW.payment_method, 'unknown') || '. Total: ' || NEW.total,
      'order',
      'restaurant'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_new_booking
CREATE OR REPLACE FUNCTION public.notify_new_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type, department)
  VALUES (
    NEW.company_id,
    'New ' || INITCAP(NEW.booking_type) || ' Booking',
    'A new ' || NEW.booking_type || ' booking has been created. Amount: ' || NEW.amount,
    'booking',
    'hotel'
  );
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_booking_status_change
CREATE OR REPLACE FUNCTION public.notify_booking_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'checked_in' AND OLD.status IS DISTINCT FROM 'checked_in' THEN
    INSERT INTO public.notifications (company_id, title, message, type, department)
    VALUES (
      NEW.company_id,
      'Guest Checked In',
      'A ' || NEW.booking_type || ' booking has been checked in. Amount: ' || NEW.amount,
      'booking',
      'hotel'
    );
  ELSIF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.notifications (company_id, title, message, type, department)
    VALUES (
      NEW.company_id,
      'Booking Cancelled',
      'A ' || NEW.booking_type || ' booking (Amount: ' || NEW.amount || ') has been cancelled.',
      'warning',
      'hotel'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_conference_booking
CREATE OR REPLACE FUNCTION public.notify_conference_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type, department)
  VALUES (
    NEW.company_id,
    'New Conference Booking',
    NEW.event_name || ' booked for ' || TO_CHAR(NEW.event_date, 'Mon DD') || COALESCE(' · ' || NEW.attendees || ' attendees', '') || '. Amount: ' || NEW.amount,
    'booking',
    'hotel'
  );
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_conference_booking_cancelled
CREATE OR REPLACE FUNCTION public.notify_conference_booking_cancelled()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' THEN
    INSERT INTO public.notifications (company_id, title, message, type, department)
    VALUES (
      NEW.company_id,
      'Conference Booking Cancelled',
      NEW.event_name || ' (' || TO_CHAR(NEW.event_date, 'Mon DD') || ') has been cancelled.',
      'warning',
      'hotel'
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Drop and recreate notify_new_staff (visible to admins only, no specific department)
CREATE OR REPLACE FUNCTION public.notify_new_staff()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.notifications (company_id, title, message, type, department)
  VALUES (
    NEW.company_id,
    'New Staff Member',
    NEW.full_name || ' has been added as ' || NEW.role || ' (' || array_to_string(NEW.department, ', ') || ')',
    'staff',
    NULL
  );
  RETURN NEW;
END;
$function$;
