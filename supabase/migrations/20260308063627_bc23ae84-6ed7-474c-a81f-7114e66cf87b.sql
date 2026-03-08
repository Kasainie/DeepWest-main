
-- Rooms table
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_number text NOT NULL,
  type text NOT NULL DEFAULT 'Standard',
  floor integer NOT NULL DEFAULT 1,
  beds integer NOT NULL DEFAULT 1,
  price_per_night numeric(10,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  amenities text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, room_number)
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view rooms" ON public.rooms FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can insert rooms" ON public.rooms FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Owner/admin can update rooms" ON public.rooms FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager'));
CREATE POLICY "Owner/admin can delete rooms" ON public.rooms FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Guests table
CREATE TABLE public.guests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  is_vip boolean NOT NULL DEFAULT false,
  total_visits integer NOT NULL DEFAULT 0,
  total_spent numeric(10,2) NOT NULL DEFAULT 0,
  last_visit timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view guests" ON public.guests FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can insert guests" ON public.guests FOR INSERT TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can update guests" ON public.guests FOR UPDATE TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete guests" ON public.guests FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Bookings table
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  guest_id uuid REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id uuid REFERENCES public.rooms(id) ON DELETE SET NULL,
  booking_type text NOT NULL DEFAULT 'room',
  details text,
  check_in date,
  check_out date,
  status text NOT NULL DEFAULT 'confirmed',
  amount numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view bookings" ON public.bookings FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can insert bookings" ON public.bookings FOR INSERT TO authenticated
  WITH CHECK (is_company_member(auth.uid(), company_id));
CREATE POLICY "Staff+ can update bookings" ON public.bookings FOR UPDATE TO authenticated
  USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Owner/admin can delete bookings" ON public.bookings FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Triggers for updated_at
CREATE TRIGGER rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
