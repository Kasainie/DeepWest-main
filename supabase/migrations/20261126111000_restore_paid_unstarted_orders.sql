UPDATE public.orders
SET status = 'pending'
WHERE status = 'completed'
  AND payment_status = 'paid'
  AND completed_at IS NULL
  AND ready_at IS NULL;
