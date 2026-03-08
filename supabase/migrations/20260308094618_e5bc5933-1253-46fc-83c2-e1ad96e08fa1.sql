-- Restrict bookings INSERT to manager+ only (was: any company member)
DROP POLICY IF EXISTS "Staff+ can insert bookings" ON public.bookings;
CREATE POLICY "Manager+ can insert bookings" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));

-- Restrict bookings UPDATE to manager+ only
DROP POLICY IF EXISTS "Staff+ can update bookings" ON public.bookings;
CREATE POLICY "Manager+ can update bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));

-- Restrict guests INSERT to manager+ only
DROP POLICY IF EXISTS "Staff+ can insert guests" ON public.guests;
CREATE POLICY "Manager+ can insert guests" ON public.guests
FOR INSERT TO authenticated
WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));

-- Restrict guests UPDATE to manager+ only
DROP POLICY IF EXISTS "Staff+ can update guests" ON public.guests;
CREATE POLICY "Manager+ can update guests" ON public.guests
FOR UPDATE TO authenticated
USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));