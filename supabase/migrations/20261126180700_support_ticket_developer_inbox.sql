CREATE POLICY "Super admins can view all support tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update support tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));
