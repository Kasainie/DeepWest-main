
CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  _name text,
  _slug text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _address text DEFAULT NULL,
  _description text DEFAULT NULL,
  _logo_url text DEFAULT NULL
)
RETURNS companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company public.companies;
  v_staff_code text;
  v_user_name text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.companies (
    name, slug, email, phone, address, description, logo_url, owner_id
  )
  VALUES (
    _name, _slug,
    NULLIF(_email, ''),
    NULLIF(_phone, ''),
    NULLIF(_address, ''),
    NULLIF(_description, ''),
    _logo_url,
    v_user_id
  )
  RETURNING * INTO v_company;

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (v_company.id, v_user_id, 'owner')
  ON CONFLICT DO NOTHING;

  UPDATE public.profiles
  SET current_company_id = v_company.id
  WHERE user_id = v_user_id;

  -- Get user's name for staff record
  SELECT COALESCE(full_name, 'Admin') INTO v_user_name
  FROM public.profiles WHERE user_id = v_user_id LIMIT 1;

  -- Generate admin staff code: ADM-XXXX (random 4-digit)
  v_staff_code := 'ADM-' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');

  -- Create staff record for owner as admin
  INSERT INTO public.company_staff (
    company_id, user_id, full_name, role, department, staff_code, is_active
  )
  VALUES (
    v_company.id, v_user_id, v_user_name, 'admin',
    ARRAY['hotel', 'restaurant', 'bar', 'kitchen', 'accountant'],
    v_staff_code, true
  )
  ON CONFLICT DO NOTHING;

  RETURN v_company;
END;
$$;
