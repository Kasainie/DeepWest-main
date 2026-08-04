DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN
    SELECT u.id FROM auth.users u
    WHERE u.email IS DISTINCT FROM 'kochjomboz04@gmail.com'
      AND u.email NOT LIKE '%@internal.local'
  LOOP
    DELETE FROM public.profiles WHERE user_id = uid;
    DELETE FROM public.user_roles WHERE user_id = uid;
    DELETE FROM public.company_members WHERE user_id = uid;
    UPDATE public.company_staff SET user_id = NULL WHERE user_id = uid;
    DELETE FROM auth.users WHERE id = uid;
  END LOOP;
END $$;