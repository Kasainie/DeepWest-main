-- Fix the workspace to the two DeepWest hotel locations.
-- External registration and ad-hoc company creation are no longer supported.

DO $$
DECLARE
  v_owner_id uuid;
  v_hotel1_id uuid;
  v_hotel2_id uuid;
BEGIN
  SELECT id INTO v_owner_id
  FROM auth.users
  WHERE lower(email) = 'kochjomboz04@gmail.com'
  LIMIT 1;

  IF v_owner_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.companies (name, slug, email, description, owner_id)
  VALUES (
    'DeepWest Hotel 1',
    'deepwest-hotel-1',
    'kochjomboz04@gmail.com',
    'DeepWest Hotel 1 workspace',
    v_owner_id
  )
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description
  RETURNING id INTO v_hotel1_id;

  INSERT INTO public.companies (name, slug, email, description, owner_id)
  VALUES (
    'DeepWest Hotel 2',
    'deepwest-hotel-2',
    'kochjomboz04@gmail.com',
    'DeepWest Hotel 2 workspace',
    v_owner_id
  )
  ON CONFLICT (slug) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description
  RETURNING id INTO v_hotel2_id;

  INSERT INTO public.company_members (company_id, user_id, role)
  SELECT v_hotel1_id, v_owner_id, 'owner'
  WHERE v_hotel1_id IS NOT NULL
  ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'owner';

  INSERT INTO public.company_members (company_id, user_id, role)
  SELECT v_hotel2_id, v_owner_id, 'owner'
  WHERE v_hotel2_id IS NOT NULL
  ON CONFLICT (company_id, user_id) DO UPDATE SET role = 'owner';

  IF v_hotel1_id IS NOT NULL THEN
    UPDATE public.company_staff
    SET full_name = 'Admin', role = 'admin', department = ARRAY['hotel'], is_active = true
    WHERE company_id = v_hotel1_id AND user_id = v_owner_id;

    INSERT INTO public.company_staff (
      company_id, user_id, full_name, role, department, staff_code, is_active
    )
    SELECT v_hotel1_id, v_owner_id, 'Admin', 'admin', ARRAY['hotel'], 'ADM-0001', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_staff
      WHERE company_id = v_hotel1_id AND user_id = v_owner_id
    )
    ON CONFLICT (company_id, staff_code) DO NOTHING;
  END IF;

  IF v_hotel2_id IS NOT NULL THEN
    UPDATE public.company_staff
    SET full_name = 'Admin', role = 'admin', department = ARRAY['hotel'], is_active = true
    WHERE company_id = v_hotel2_id AND user_id = v_owner_id;

    INSERT INTO public.company_staff (
      company_id, user_id, full_name, role, department, staff_code, is_active
    )
    SELECT v_hotel2_id, v_owner_id, 'Admin', 'admin', ARRAY['hotel'], 'ADM-0002', true
    WHERE NOT EXISTS (
      SELECT 1 FROM public.company_staff
      WHERE company_id = v_hotel2_id AND user_id = v_owner_id
    )
    ON CONFLICT (company_id, staff_code) DO NOTHING;
  END IF;

  UPDATE public.profiles
  SET current_company_id = v_hotel1_id
  WHERE user_id = v_owner_id;
END $$;

REVOKE ALL ON FUNCTION public.create_company_with_owner(text, text, text, text, text, text, text)
FROM PUBLIC, anon, authenticated;
