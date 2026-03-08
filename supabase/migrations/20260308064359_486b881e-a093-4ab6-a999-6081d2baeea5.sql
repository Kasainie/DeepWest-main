
-- Company staff table: staff members with codes and departments
CREATE TABLE public.company_staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid,
  full_name text NOT NULL,
  staff_code text NOT NULL,
  department text NOT NULL DEFAULT 'hotel',
  role text NOT NULL DEFAULT 'staff',
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(company_id, staff_code)
);

ALTER TABLE public.company_staff ENABLE ROW LEVEL SECURITY;

-- Members can view their company's staff
CREATE POLICY "Members can view company staff"
  ON public.company_staff FOR SELECT TO authenticated
  USING (is_company_member(auth.uid(), company_id));

-- Owner/admin can manage staff
CREATE POLICY "Owner/admin can insert staff"
  ON public.company_staff FOR INSERT TO authenticated
  WITH CHECK (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can update staff"
  ON public.company_staff FOR UPDATE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

CREATE POLICY "Owner/admin can delete staff"
  ON public.company_staff FOR DELETE TO authenticated
  USING (get_company_role(auth.uid(), company_id) IN ('owner', 'admin'));

-- Trigger for updated_at
CREATE TRIGGER company_staff_updated_at BEFORE UPDATE ON public.company_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to look up staff by code (used by edge function, security definer)
CREATE OR REPLACE FUNCTION public.lookup_staff_by_code(_staff_code text)
RETURNS TABLE(
  staff_id uuid,
  company_id uuid,
  full_name text,
  department text,
  role text,
  company_name text,
  is_active boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    cs.id as staff_id,
    cs.company_id,
    cs.full_name,
    cs.department,
    cs.role,
    c.name as company_name,
    cs.is_active
  FROM public.company_staff cs
  JOIN public.companies c ON c.id = cs.company_id
  WHERE cs.staff_code = _staff_code
  LIMIT 1
$$;
