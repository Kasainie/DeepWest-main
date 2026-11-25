CREATE OR REPLACE FUNCTION public.delete_order_sale_on_order_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.sales
  WHERE company_id = OLD.company_id
    AND reference_id = OLD.id
    AND reference_type = 'order';

  RETURN OLD;
END;
$$;

CREATE TRIGGER delete_order_sale_on_order_delete
AFTER DELETE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.delete_order_sale_on_order_delete();
