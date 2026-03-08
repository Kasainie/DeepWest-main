
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid DEFAULT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view notifications for their company (or addressed to them specifically)
CREATE POLICY "Members can view company notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    is_company_member(auth.uid(), company_id) 
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    is_company_member(auth.uid(), company_id)
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Owner/admin can insert notifications
CREATE POLICY "Owner/admin can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner', 'admin', 'manager'])
  );

-- Owner/admin can delete notifications
CREATE POLICY "Owner/admin can delete notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (
    get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner', 'admin'])
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
