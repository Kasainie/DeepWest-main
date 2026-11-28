ALTER TABLE public.company_staff
  ADD CONSTRAINT company_staff_company_id_id_unique UNIQUE (company_id, id);

CREATE TABLE public.staff_management_settings (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.staff_profiles (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, staff_id),
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.staff_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text NOT NULL DEFAULT 'cash'
    CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'cheque', 'other')),
  reference text,
  notes text,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pay_period_end >= pay_period_start),
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.staff_leave_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  leave_type text NOT NULL CHECK (leave_type IN ('annual', 'sick', 'unpaid', 'other')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  review_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date),
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.staff_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  clocked_in_at timestamptz NOT NULL DEFAULT now(),
  clocked_out_at timestamptz,
  notes text,
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE,
  CHECK (clocked_out_at IS NULL OR clocked_out_at >= clocked_in_at)
);

CREATE UNIQUE INDEX staff_attendance_one_open_shift_per_staff
  ON public.staff_attendance (staff_id)
  WHERE clocked_out_at IS NULL;

CREATE TABLE public.staff_shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at),
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.staff_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('advance', 'deduction')),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE
);

CREATE TABLE public.staff_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL,
  file_name text NOT NULL,
  document_type text NOT NULL DEFAULT 'other'
    CHECK (document_type IN ('contract', 'identification', 'certificate', 'other')),
  storage_path text NOT NULL UNIQUE,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (company_id, staff_id)
    REFERENCES public.company_staff(company_id, id) ON DELETE CASCADE
);

CREATE INDEX staff_payments_company_payment_date_idx
  ON public.staff_payments (company_id, payment_date DESC);
CREATE INDEX staff_leave_requests_company_created_at_idx
  ON public.staff_leave_requests (company_id, created_at DESC);
CREATE INDEX staff_attendance_company_clocked_in_at_idx
  ON public.staff_attendance (company_id, clocked_in_at DESC);
CREATE INDEX staff_shifts_company_starts_at_idx
  ON public.staff_shifts (company_id, starts_at DESC);
CREATE INDEX staff_adjustments_company_created_at_idx
  ON public.staff_adjustments (company_id, created_at DESC);
CREATE INDEX staff_documents_company_created_at_idx
  ON public.staff_documents (company_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.is_staff_management_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = _company_id
      AND owner_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_own_staff_management_record(
  _company_id uuid,
  _staff_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_staff
    WHERE company_id = _company_id
      AND id = _staff_id
      AND user_id = auth.uid()
      AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION public.staff_management_is_enabled(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE((
    SELECT enabled
    FROM public.staff_management_settings
    WHERE company_id = _company_id
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_staff_management_owner(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_own_staff_management_record(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_management_is_enabled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff_management_owner(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_own_staff_management_record(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.staff_management_is_enabled(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Members can view company staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can view all staff" ON public.company_staff;
DROP POLICY IF EXISTS "Managers can view lower ranked staff" ON public.company_staff;
DROP POLICY IF EXISTS "Manager+ can view all staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can insert staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can update staff" ON public.company_staff;
DROP POLICY IF EXISTS "Owner/admin can delete staff" ON public.company_staff;
DROP POLICY IF EXISTS "Manager+ can insert staff" ON public.company_staff;
DROP POLICY IF EXISTS "Manager+ can update staff" ON public.company_staff;
DROP POLICY IF EXISTS "Manager+ can delete staff" ON public.company_staff;

CREATE POLICY "Company owner can view all staff"
  ON public.company_staff FOR SELECT TO authenticated
  USING (public.is_staff_management_owner(company_id));
CREATE POLICY "Company owner can insert staff"
  ON public.company_staff FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Company owner can update staff"
  ON public.company_staff FOR UPDATE TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Company owner can delete staff"
  ON public.company_staff FOR DELETE TO authenticated
  USING (public.is_staff_management_owner(company_id));

CREATE OR REPLACE FUNCTION public.set_staff_password(_staff_id uuid, _password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _password IS NULL OR length(_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  SELECT company_id INTO v_company_id
  FROM public.company_staff
  WHERE id = _staff_id;
  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Staff not found';
  END IF;
  IF NOT public.is_staff_management_owner(v_company_id) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.company_staff
  SET password_hash = extensions.crypt(_password, extensions.gen_salt('bf', 10)),
      updated_at = now()
  WHERE id = _staff_id;
END;
$$;

ALTER TABLE public.staff_management_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view staff management setting"
  ON public.staff_management_settings FOR SELECT TO authenticated
  USING (public.is_company_member(auth.uid(), company_id));
CREATE POLICY "Company owner can insert staff management setting"
  ON public.staff_management_settings FOR INSERT TO authenticated
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Company owner can update staff management setting"
  ON public.staff_management_settings FOR UPDATE TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));

CREATE POLICY "Company owner can manage staff profiles"
  ON public.staff_profiles FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own profile when enabled"
  ON public.staff_profiles FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can update own profile when enabled"
  ON public.staff_profiles FOR UPDATE TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  )
  WITH CHECK (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can create own profile when enabled"
  ON public.staff_profiles FOR INSERT TO authenticated
  WITH CHECK (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE POLICY "Company owner can manage staff payments"
  ON public.staff_payments FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own payments when enabled"
  ON public.staff_payments FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE POLICY "Company owner can manage staff leave requests"
  ON public.staff_leave_requests FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own leave requests when enabled"
  ON public.staff_leave_requests FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can request own leave when enabled"
  ON public.staff_leave_requests FOR INSERT TO authenticated
  WITH CHECK (
    status = 'pending'
    AND public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can cancel own pending leave when enabled"
  ON public.staff_leave_requests FOR UPDATE TO authenticated
  USING (
    status = 'pending'
    AND public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  )
  WITH CHECK (
    status IN ('pending', 'cancelled')
    AND public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE POLICY "Company owner can manage staff attendance"
  ON public.staff_attendance FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own attendance when enabled"
  ON public.staff_attendance FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE POLICY "Company owner can manage staff shifts"
  ON public.staff_shifts FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own shifts when enabled"
  ON public.staff_shifts FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE POLICY "Company owner can manage staff adjustments"
  ON public.staff_adjustments FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own adjustments when enabled"
  ON public.staff_adjustments FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can request own advances when enabled"
  ON public.staff_adjustments FOR INSERT TO authenticated
  WITH CHECK (
    adjustment_type = 'advance'
    AND status = 'pending'
    AND public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can cancel own pending advances when enabled"
  ON public.staff_adjustments FOR UPDATE TO authenticated
  USING (
    adjustment_type = 'advance'
    AND status = 'pending'
    AND public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  )
  WITH CHECK (
    adjustment_type = 'advance'
    AND status IN ('pending', 'cancelled')
    AND public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE POLICY "Company owner can manage staff documents"
  ON public.staff_documents FOR ALL TO authenticated
  USING (public.is_staff_management_owner(company_id))
  WITH CHECK (public.is_staff_management_owner(company_id));
CREATE POLICY "Staff can view own documents when enabled"
  ON public.staff_documents FOR SELECT TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can add own documents when enabled"
  ON public.staff_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
CREATE POLICY "Staff can delete own documents when enabled"
  ON public.staff_documents FOR DELETE TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );

CREATE OR REPLACE FUNCTION public.staff_clock_in(_staff_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
  v_attendance_id uuid;
BEGIN
  SELECT company_id INTO v_company_id
  FROM public.company_staff
  WHERE id = _staff_id
    AND user_id = auth.uid()
    AND is_active;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Active staff profile not found';
  END IF;
  IF NOT public.staff_management_is_enabled(v_company_id) THEN
    RAISE EXCEPTION 'Staff management is not enabled';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.staff_attendance
    WHERE staff_id = _staff_id
      AND clocked_out_at IS NULL
  ) THEN
    RAISE EXCEPTION 'You are already clocked in';
  END IF;

  INSERT INTO public.staff_attendance (company_id, staff_id)
  VALUES (v_company_id, _staff_id)
  RETURNING id INTO v_attendance_id;

  RETURN v_attendance_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.staff_clock_out(_attendance_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_company_id uuid;
BEGIN
  UPDATE public.staff_attendance AS attendance
  SET clocked_out_at = now()
  FROM public.company_staff AS staff
  WHERE attendance.id = _attendance_id
    AND staff.id = attendance.staff_id
    AND staff.user_id = auth.uid()
    AND staff.is_active
    AND attendance.clocked_out_at IS NULL
    AND public.staff_management_is_enabled(attendance.company_id)
  RETURNING attendance.company_id INTO v_company_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Open attendance record not found';
  END IF;

  RETURN _attendance_id;
END;
$$;

REVOKE ALL ON FUNCTION public.staff_clock_in(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.staff_clock_out(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.staff_clock_in(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.staff_clock_out(uuid) TO authenticated;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('staff-documents', 'staff-documents', false, 10485760)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = 10485760;

CREATE POLICY "Owner can access staff document files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1 FROM public.companies
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1 FROM public.companies
      WHERE id::text = (storage.foldername(name))[1]
        AND owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff can access own document files when enabled"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1
      FROM public.company_staff
      WHERE company_id::text = (storage.foldername(name))[1]
        AND id::text = (storage.foldername(name))[2]
        AND user_id = auth.uid()
        AND is_active
        AND public.staff_management_is_enabled(company_id)
    )
  );

CREATE POLICY "Staff can upload own document files when enabled"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1
      FROM public.company_staff
      WHERE company_id::text = (storage.foldername(name))[1]
        AND id::text = (storage.foldername(name))[2]
        AND user_id = auth.uid()
        AND is_active
        AND public.staff_management_is_enabled(company_id)
    )
  );

CREATE POLICY "Staff can delete own document files when enabled"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1
      FROM public.company_staff
      WHERE company_id::text = (storage.foldername(name))[1]
        AND id::text = (storage.foldername(name))[2]
        AND user_id = auth.uid()
        AND is_active
        AND public.staff_management_is_enabled(company_id)
    )
  );
