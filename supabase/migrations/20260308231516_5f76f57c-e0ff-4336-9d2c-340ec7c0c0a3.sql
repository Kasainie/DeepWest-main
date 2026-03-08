
CREATE OR REPLACE FUNCTION public.auto_create_sale_on_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    INSERT INTO public.sales (
      company_id, sale_date, department, category, description,
      amount, payment_method, reference_id, reference_type, created_by
    ) VALUES (
      NEW.company_id,
      (NEW.paid_at AT TIME ZONE 'Africa/Nairobi')::date,
      'restaurant',
      'food',
      'Order #' || NEW.order_number || COALESCE(' · Table ' || NEW.table_number, ''),
      NEW.total,
      COALESCE(NEW.payment_method, 'cash'),
      NEW.id,
      'order',
      NEW.created_by
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_sale_on_payment
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_sale_on_payment();
