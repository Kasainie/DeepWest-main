-- Staff login accounts use a dedicated synthetic email per staff record.
-- Do not keep a real administrator account linked to a staff login record.
UPDATE public.company_staff AS staff
SET user_id = NULL,
    updated_at = now()
FROM auth.users AS auth_user
WHERE auth_user.id = staff.user_id
  AND lower(auth_user.email) <> lower('staff-' || staff.id::text || '@internal.local');
