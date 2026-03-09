
-- ============================================================
-- FIX 1: Convert all RESTRICTIVE policies to PERMISSIVE
-- We drop and recreate every policy as PERMISSIVE.
-- ============================================================

-- bar_inventory
DROP POLICY IF EXISTS "Manager+ can insert bar inventory" ON public.bar_inventory;
DROP POLICY IF EXISTS "Manager+ can update bar inventory" ON public.bar_inventory;
DROP POLICY IF EXISTS "Members can view bar inventory" ON public.bar_inventory;
DROP POLICY IF EXISTS "Owner/admin can delete bar inventory" ON public.bar_inventory;

CREATE POLICY "Manager+ can insert bar inventory" ON public.bar_inventory FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update bar inventory" ON public.bar_inventory FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view bar inventory" ON public.bar_inventory FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete bar inventory" ON public.bar_inventory FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- bookings
DROP POLICY IF EXISTS "Manager+ can insert bookings" ON public.bookings;
DROP POLICY IF EXISTS "Manager+ can update bookings" ON public.bookings;
DROP POLICY IF EXISTS "Members can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Owner/admin can delete bookings" ON public.bookings;

CREATE POLICY "Manager+ can insert bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view bookings" ON public.bookings FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete bookings" ON public.bookings FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- companies
DROP POLICY IF EXISTS "Anyone authenticated can create a company" ON public.companies;
DROP POLICY IF EXISTS "Members can view their company" ON public.companies;
DROP POLICY IF EXISTS "Owner can delete company" ON public.companies;
DROP POLICY IF EXISTS "Owner/admin can update company" ON public.companies;

CREATE POLICY "Anyone authenticated can create a company" ON public.companies FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Members can view their company" ON public.companies FOR SELECT TO authenticated USING (is_company_member(auth.uid(), id));
CREATE POLICY "Owner can delete company" ON public.companies FOR DELETE TO authenticated USING (get_company_role(auth.uid(), id) = 'owner');
CREATE POLICY "Owner/admin can update company" ON public.companies FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), id) IN ('owner','admin'));

-- company_branding
DROP POLICY IF EXISTS "Members can view branding" ON public.company_branding;
DROP POLICY IF EXISTS "Owner/admin can delete branding" ON public.company_branding;
DROP POLICY IF EXISTS "Owner/admin can insert branding" ON public.company_branding;
DROP POLICY IF EXISTS "Owner/admin can update branding" ON public.company_branding;

CREATE POLICY "Members can view branding" ON public.company_branding FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete branding" ON public.company_branding FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can insert branding" ON public.company_branding FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can update branding" ON public.company_branding FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- company_invitations
DROP POLICY IF EXISTS "Owner/admin can create invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owner/admin can delete invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owner/admin can update invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "Owner/admin can view all invitations" ON public.company_invitations;
DROP POLICY IF EXISTS "User can read own invitation by token" ON public.company_invitations;

CREATE POLICY "Owner/admin can create invitations" ON public.company_invitations FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can delete invitations" ON public.company_invitations FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can update invitations" ON public.company_invitations FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can view all invitations" ON public.company_invitations FOR SELECT TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "User can read own invitation by email" ON public.company_invitations FOR SELECT TO authenticated USING (email = (SELECT email FROM auth.users WHERE id = auth.uid())::text);

-- company_members
DROP POLICY IF EXISTS "Members can view company members" ON public.company_members;
DROP POLICY IF EXISTS "Owner/admin can delete members" ON public.company_members;
DROP POLICY IF EXISTS "Owner/admin can update members" ON public.company_members;
DROP POLICY IF EXISTS "Owner/admin or invited user can insert" ON public.company_members;

CREATE POLICY "Members can view company members" ON public.company_members FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete members" ON public.company_members FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can update members" ON public.company_members FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin or invited user can insert" ON public.company_members FOR INSERT TO authenticated WITH CHECK (
  get_company_role(auth.uid(), company_id) IN ('owner','admin')
  OR EXISTS (
    SELECT 1 FROM public.company_invitations ci
    WHERE ci.company_id = company_members.company_id
      AND ci.email = (SELECT email FROM auth.users WHERE id = auth.uid())::text
      AND ci.status = 'pending'
      AND ci.expires_at > now()
      AND company_members.user_id = auth.uid()
      AND company_members.role = ci.role
  )
);

-- company_staff
DROP POLICY IF EXISTS "Members can view company staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can delete staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can insert staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can update staff" ON public.company_staff;
DROP POLICY IF EXISTS "Staff can view own record by user_id" ON public.company_staff;

CREATE POLICY "Members can view company staff" ON public.company_staff FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete staff" ON public.company_staff FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can insert staff" ON public.company_staff FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can update staff" ON public.company_staff FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Staff can view own record by user_id" ON public.company_staff FOR SELECT TO authenticated USING (user_id = auth.uid());

-- conference_bookings
DROP POLICY IF EXISTS "Manager+ can insert conference bookings" ON public.conference_bookings;
DROP POLICY IF EXISTS "Manager+ can update conference bookings" ON public.conference_bookings;
DROP POLICY IF EXISTS "Members can view conference bookings" ON public.conference_bookings;
DROP POLICY IF EXISTS "Owner/admin can delete conference bookings" ON public.conference_bookings;

CREATE POLICY "Manager+ can insert conference bookings" ON public.conference_bookings FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update conference bookings" ON public.conference_bookings FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view conference bookings" ON public.conference_bookings FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete conference bookings" ON public.conference_bookings FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- conference_rooms
DROP POLICY IF EXISTS "Manager+ can insert conference rooms" ON public.conference_rooms;
DROP POLICY IF EXISTS "Manager+ can update conference rooms" ON public.conference_rooms;
DROP POLICY IF EXISTS "Members can view conference rooms" ON public.conference_rooms;
DROP POLICY IF EXISTS "Owner/admin can delete conference rooms" ON public.conference_rooms;

CREATE POLICY "Manager+ can insert conference rooms" ON public.conference_rooms FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update conference rooms" ON public.conference_rooms FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view conference rooms" ON public.conference_rooms FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete conference rooms" ON public.conference_rooms FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- expense_categories
DROP POLICY IF EXISTS "Manager+ can insert expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Manager+ can update expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Members can view expense categories" ON public.expense_categories;
DROP POLICY IF EXISTS "Owner/admin can delete expense categories" ON public.expense_categories;

CREATE POLICY "Manager+ can insert expense categories" ON public.expense_categories FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update expense categories" ON public.expense_categories FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view expense categories" ON public.expense_categories FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete expense categories" ON public.expense_categories FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- expenses
DROP POLICY IF EXISTS "Manager+ can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Manager+ can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Members can view expenses" ON public.expenses;
DROP POLICY IF EXISTS "Owner/admin can delete expenses" ON public.expenses;

CREATE POLICY "Manager+ can insert expenses" ON public.expenses FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update expenses" ON public.expenses FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view expenses" ON public.expenses FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete expenses" ON public.expenses FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- guests
DROP POLICY IF EXISTS "Manager+ can insert guests" ON public.guests;
DROP POLICY IF EXISTS "Manager+ can update guests" ON public.guests;
DROP POLICY IF EXISTS "Members can view guests" ON public.guests;
DROP POLICY IF EXISTS "Owner/admin can delete guests" ON public.guests;

CREATE POLICY "Manager+ can insert guests" ON public.guests FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update guests" ON public.guests FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view guests" ON public.guests FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete guests" ON public.guests FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- menu_items
DROP POLICY IF EXISTS "Manager+ can delete menu" ON public.menu_items;
DROP POLICY IF EXISTS "Manager+ can insert menu" ON public.menu_items;
DROP POLICY IF EXISTS "Manager+ can update menu" ON public.menu_items;
DROP POLICY IF EXISTS "Members can view menu" ON public.menu_items;

CREATE POLICY "Manager+ can delete menu" ON public.menu_items FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Manager+ can insert menu" ON public.menu_items FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update menu" ON public.menu_items FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view menu" ON public.menu_items FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));

-- notifications
DROP POLICY IF EXISTS "Members can view company notifications" ON public.notifications;
DROP POLICY IF EXISTS "Owner/admin can delete notifications" ON public.notifications;
DROP POLICY IF EXISTS "Owner/admin can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Members can view company notifications" ON public.notifications FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id) AND (user_id IS NULL OR user_id = auth.uid()));
CREATE POLICY "Owner/admin can delete notifications" ON public.notifications FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id) AND (user_id IS NULL OR user_id = auth.uid()));

-- order_items
DROP POLICY IF EXISTS "Admin can delete order items" ON public.order_items;
DROP POLICY IF EXISTS "Members can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff+ can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff+ can update order items" ON public.order_items;

CREATE POLICY "Admin can delete order items" ON public.order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND get_company_role(auth.uid(), o.company_id) IN ('owner','admin')));
CREATE POLICY "Members can view order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND is_company_member(auth.uid(), o.company_id)));
CREATE POLICY "Staff+ can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND is_company_member(auth.uid(), o.company_id)));
CREATE POLICY "Staff+ can update order items" ON public.order_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM orders o WHERE o.id = order_items.order_id AND is_company_member(auth.uid(), o.company_id)));

-- orders
DROP POLICY IF EXISTS "Admin can delete orders" ON public.orders;
DROP POLICY IF EXISTS "Members can view orders" ON public.orders;
DROP POLICY IF EXISTS "Staff+ can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Staff+ can update orders" ON public.orders;

CREATE POLICY "Admin can delete orders" ON public.orders FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Members can view orders" ON public.orders FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can update orders" ON public.orders FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id));

-- payment_tenders
DROP POLICY IF EXISTS "Manager+ can insert tenders" ON public.payment_tenders;
DROP POLICY IF EXISTS "Manager+ can update tenders" ON public.payment_tenders;
DROP POLICY IF EXISTS "Members can view tenders" ON public.payment_tenders;
DROP POLICY IF EXISTS "Owner/admin can delete tenders" ON public.payment_tenders;

CREATE POLICY "Manager+ can insert tenders" ON public.payment_tenders FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update tenders" ON public.payment_tenders FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view tenders" ON public.payment_tenders FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete tenders" ON public.payment_tenders FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- profiles
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;

CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- rooms
DROP POLICY IF EXISTS "Members can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owner/admin can delete rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owner/admin can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Owner/admin can update rooms" ON public.rooms;

CREATE POLICY "Members can view rooms" ON public.rooms FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete rooms" ON public.rooms FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));
CREATE POLICY "Owner/admin can insert rooms" ON public.rooms FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Owner/admin can update rooms" ON public.rooms FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));

-- sales
DROP POLICY IF EXISTS "Manager+ can insert sales" ON public.sales;
DROP POLICY IF EXISTS "Manager+ can update sales" ON public.sales;
DROP POLICY IF EXISTS "Members can view sales" ON public.sales;
DROP POLICY IF EXISTS "Owner/admin can delete sales" ON public.sales;

CREATE POLICY "Manager+ can insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Manager+ can update sales" ON public.sales FOR UPDATE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin','manager'));
CREATE POLICY "Members can view sales" ON public.sales FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete sales" ON public.sales FOR DELETE TO authenticated USING (get_company_role(auth.uid(), company_id) IN ('owner','admin'));

-- support_tickets
DROP POLICY IF EXISTS "Members can insert tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Members can view own tickets" ON public.support_tickets;

CREATE POLICY "Members can insert tickets" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND is_company_member(auth.uid(), company_id));
CREATE POLICY "Members can view own tickets" ON public.support_tickets FOR SELECT TO authenticated USING (user_id = auth.uid());

-- user_roles
DROP POLICY IF EXISTS "Admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- website_pages
DROP POLICY IF EXISTS "Company members can delete pages" ON public.website_pages;
DROP POLICY IF EXISTS "Company members can insert pages" ON public.website_pages;
DROP POLICY IF EXISTS "Company members can update pages" ON public.website_pages;
DROP POLICY IF EXISTS "Company members can view pages" ON public.website_pages;

CREATE POLICY "Company members can delete pages" ON public.website_pages FOR DELETE TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company members can insert pages" ON public.website_pages FOR INSERT TO authenticated WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company members can update pages" ON public.website_pages FOR UPDATE TO authenticated USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Company members can view pages" ON public.website_pages FOR SELECT TO authenticated USING (is_company_member(auth.uid(), company_id));

-- ============================================================
-- FIX 2: Create login_attempts table for rate limiting
-- ============================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_code text NOT NULL,
  attempted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text
);

ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
-- No client access needed; only service role uses this table
