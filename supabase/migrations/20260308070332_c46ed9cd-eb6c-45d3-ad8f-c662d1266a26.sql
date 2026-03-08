CREATE OR REPLACE FUNCTION public.create_company_with_owner(
  _name text,
  _slug text,
  _email text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _address text DEFAULT NULL,
  _description text DEFAULT NULL,
  _logo_url text DEFAULT NULL
)
RETURNS public.companies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_company public.companies;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.companies (
    name,
    slug,
    email,
    phone,
    address,
    description,
    logo_url,
    owner_id
  )
  VALUES (
    _name,
    _slug,
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

  RETURN v_company;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_company_with_owner(text, text, text, text, text, text, text) TO authenticated;