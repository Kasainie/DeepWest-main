
-- Conference rooms table
CREATE TABLE public.conference_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  capacity integer NOT NULL DEFAULT 20,
  price_per_day numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available',
  amenities text[] DEFAULT '{}'::text[],
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conference_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view conference rooms" ON public.conference_rooms FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert conference rooms" ON public.conference_rooms FOR INSERT WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Manager+ can update conference rooms" ON public.conference_rooms FOR UPDATE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Owner/admin can delete conference rooms" ON public.conference_rooms FOR DELETE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

CREATE TRIGGER update_conference_rooms_updated_at BEFORE UPDATE ON public.conference_rooms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Conference bookings/events table
CREATE TABLE public.conference_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_id uuid NOT NULL REFERENCES public.conference_rooms(id) ON DELETE CASCADE,
  event_name text NOT NULL,
  organizer text,
  attendees integer NOT NULL DEFAULT 0,
  event_date date NOT NULL,
  end_date date,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'confirmed',
  notes text,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conference_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view conference bookings" ON public.conference_bookings FOR SELECT USING (is_company_member(auth.uid(), company_id));
CREATE POLICY "Manager+ can insert conference bookings" ON public.conference_bookings FOR INSERT WITH CHECK (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Manager+ can update conference bookings" ON public.conference_bookings FOR UPDATE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager']));
CREATE POLICY "Owner/admin can delete conference bookings" ON public.conference_bookings FOR DELETE USING (get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

CREATE TRIGGER update_conference_bookings_updated_at BEFORE UPDATE ON public.conference_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
