
-- Fix 1: user_roles SELECT - restrict to own role only (admins get broader access via has_role)
DROP POLICY IF EXISTS "Authenticated users can view roles" ON public.user_roles;
CREATE POLICY "Users can view own role"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- Fix 2: Invitation token exposure - only owner/admin can see all invitations, invitees see their own
DROP POLICY IF EXISTS "Company members can view invitations" ON public.company_invitations;
CREATE POLICY "Owner/admin can view all invitations"
  ON public.company_invitations FOR SELECT
  TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Fix 3: Re-scope public-role policies to authenticated on 6 tables
-- conference_bookings
DROP POLICY IF EXISTS "Manager+ can insert conference bookings" ON public.conference_bookings;
DROP POLICY IF EXISTS "Manager+ can update conference bookings" ON public.conference_bookings;
DROP POLICY IF EXISTS "Members can view conference bookings" ON public.conference_bookings;
DROP POLICY IF EXISTS "Owner/admin can delete conference bookings" ON public.conference_bookings;

CREATE POLICY "Manager+ can insert conference bookings" ON public.conference_bookings FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update conference bookings" ON public.conference_bookings FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Members can view conference bookings" ON public.conference_bookings FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete conference bookings" ON public.conference_bookings FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- conference_rooms
DROP POLICY IF EXISTS "Manager+ can insert conference rooms" ON public.conference_rooms;
DROP POLICY IF EXISTS "Manager+ can update conference rooms" ON public.conference_rooms;
DROP POLICY IF EXISTS "Members can view conference rooms" ON public.conference_rooms;
DROP POLICY IF EXISTS "Owner/admin can delete conference rooms" ON public.conference_rooms;

CREATE POLICY "Manager+ can insert conference rooms" ON public.conference_rooms FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update conference rooms" ON public.conference_rooms FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Members can view conference rooms" ON public.conference_rooms FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete conference rooms" ON public.conference_rooms FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- expense_categories
DROP POLICY IF EXISTS "Manager+ can insert expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Manager+ can update expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Members can view expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Owner/admin can delete expense categories" ON public.expense_categories;

CREATE POLICY "Manager+ can insert expense categories" ON public.expense_categories FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update expense categories" ON public.expense_categories FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Members can view expense categories" ON public.expense_categories FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete expense categories" ON public.expense_categories FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- expenses
DROP POLICY IF EXISTS "Manager+ can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Manager+ can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner/admin can delete expenses" ON public.expenses;

CREATE POLICY "Manager+ can insert expenses" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update expenses" ON public.expenses FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete expenses" ON public.expenses FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- payment_tenders
DROP POLICY IF EXISTS "Manager+ can insert tenders" ON public.payment_tenders;
DROP POLICY IF EXISTS "Manager+ can update tenders" ON public.payment_tenders;
DROP POLICY IF EXISTS "Members can view tenders" ON public.payment_tenders;
DROP POLICY IF EXISTS "Owner/admin can delete tenders" ON public.payment_tenders;

CREATE POLICY "Manager+ can insert tenders" ON public.payment_tenders FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update tenders" ON public.payment_tenders FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Members can view tenders" ON public.payment_tenders FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete tenders" ON public.payment_tenders FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- sales
DROP POLICY IF EXISTS "Manager+ can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Manager+ can update sales" ON public.sales;
DROP POLICY IF EXISTS "Members can view sales" ON public.sales;
DROP POLICY IF EXISTS "Owner/admin can delete sales" ON public.sales;

CREATE POLICY "Manager+ can insert sales" ON public.sales FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Manager+ can update sales" ON public.sales FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Members can view sales" ON public.sales FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete sales" ON public.sales FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));
