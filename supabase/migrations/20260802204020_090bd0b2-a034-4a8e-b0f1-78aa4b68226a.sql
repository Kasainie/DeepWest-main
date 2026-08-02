
-- ============ 1. Super admin flag ============
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_super_admin boolean NOT NULL DEFAULT false;

UPDATE public.profiles p
SET is_super_admin = true
FROM auth.users u
WHERE u.id = p.user_id AND lower(u.email) = 'kochjomboz04@gmail.com';

CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND is_super_admin);
$$;

-- protect privileged profile columns
CREATE OR REPLACE FUNCTION public.protect_is_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('role', true) IS DISTINCT FROM 'service_role' THEN
    NEW.is_approved := OLD.is_approved;
    NEW.is_super_admin := OLD.is_super_admin;
  END IF;
  RETURN NEW;
END;
$$;

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ============ 2. Pause enforcement ============
CREATE OR REPLACE FUNCTION public.is_company_member_raw(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members
    WHERE user_id = _user_id AND company_id = _company_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_company_member(_user_id uuid, _company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_members m
    JOIN public.companies c ON c.id = m.company_id
    WHERE m.user_id = _user_id AND m.company_id = _company_id
      AND (NOT c.is_paused OR public.is_super_admin(_user_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.get_company_role(_user_id uuid, _company_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.role FROM public.company_members m
  JOIN public.companies c ON c.id = m.company_id
  WHERE m.user_id = _user_id AND m.company_id = _company_id
    AND (NOT c.is_paused OR public.is_super_admin(_user_id))
  LIMIT 1;
$$;

-- keep company/member visibility working so the paused screen can render
DROP POLICY IF EXISTS "Members can view their company" ON public.companies;
CREATE POLICY "Members can view their company" ON public.companies
FOR SELECT TO authenticated
USING (public.is_company_member_raw(auth.uid(), id) OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "Members can view company members" ON public.company_members;
CREATE POLICY "Members can view company members" ON public.company_members
FOR SELECT TO authenticated
USING (public.is_company_member_raw(auth.uid(), company_id) OR public.is_super_admin(auth.uid()));

-- ============ 3. Role hierarchy ============
CREATE OR REPLACE FUNCTION public.role_rank(_role text)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE _role WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'manager' THEN 2 WHEN 'staff' THEN 1 ELSE 0 END;
$$;

DROP POLICY IF EXISTS "Manager+ can insert staff" ON public.company_staff;
CREATE POLICY "Manager+ can insert staff" ON public.company_staff
FOR INSERT TO authenticated
WITH CHECK (
  (public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin'])
    AND public.role_rank(role) <= public.role_rank(public.get_company_role(auth.uid(), company_id)))
  OR (public.get_company_role(auth.uid(), company_id) = 'manager' AND role = 'staff')
);

DROP POLICY IF EXISTS "Manager+ can update staff" ON public.company_staff;
CREATE POLICY "Manager+ can update staff" ON public.company_staff
FOR UPDATE TO authenticated
USING (
  public.role_rank(role) <= public.role_rank(public.get_company_role(auth.uid(), company_id))
  AND public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager'])
)
WITH CHECK (
  (public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin'])
    AND public.role_rank(role) <= public.role_rank(public.get_company_role(auth.uid(), company_id)))
  OR (public.get_company_role(auth.uid(), company_id) = 'manager' AND role = 'staff')
);

DROP POLICY IF EXISTS "Manager+ can delete staff" ON public.company_staff;
CREATE POLICY "Manager+ can delete staff" ON public.company_staff
FOR DELETE TO authenticated
USING (
  public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin','manager'])
  AND public.role_rank(role) < public.role_rank(public.get_company_role(auth.uid(), company_id))
);

-- managers must not see staff codes of equal/higher ranked staff
DROP POLICY IF EXISTS "Manager+ can view all staff" ON public.company_staff;
CREATE POLICY "Owner/admin can view all staff" ON public.company_staff
FOR SELECT TO authenticated
USING (public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

CREATE POLICY "Managers can view lower ranked staff" ON public.company_staff
FOR SELECT TO authenticated
USING (
  public.get_company_role(auth.uid(), company_id) = 'manager'
  AND public.role_rank(role) < 2
);

DROP POLICY IF EXISTS "Manager+ can create invitations" ON public.company_invitations;
CREATE POLICY "Manager+ can create invitations" ON public.company_invitations
FOR INSERT TO authenticated
WITH CHECK (
  (public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin'])
    AND public.role_rank(role) <= public.role_rank(public.get_company_role(auth.uid(), company_id)))
  OR (public.get_company_role(auth.uid(), company_id) = 'manager' AND role = 'staff')
);

-- ============ 4. Invitation acceptance via verified routine ============
DROP POLICY IF EXISTS "Owner/admin or invited user can insert" ON public.company_members;
CREATE POLICY "Owner/admin can insert members" ON public.company_members
FOR INSERT TO authenticated
WITH CHECK (public.get_company_role(auth.uid(), company_id) = ANY (ARRAY['owner','admin']));

CREATE OR REPLACE FUNCTION public.accept_invitation(_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv public.company_invitations%ROWTYPE;
  caller_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT email INTO caller_email FROM auth.users WHERE id = auth.uid();

  SELECT * INTO inv FROM public.company_invitations
  WHERE token = _token AND status = 'pending' AND expires_at > now();

  IF inv.id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found or expired';
  END IF;

  IF lower(inv.email) IS DISTINCT FROM lower(caller_email) THEN
    RAISE EXCEPTION 'Invitation was issued to a different email';
  END IF;

  INSERT INTO public.company_members (company_id, user_id, role)
  VALUES (inv.company_id, auth.uid(), inv.role)
  ON CONFLICT (company_id, user_id) DO NOTHING;

  UPDATE public.company_invitations SET status = 'accepted' WHERE id = inv.id;
  UPDATE public.profiles SET current_company_id = inv.company_id WHERE user_id = auth.uid();

  RETURN inv.company_id;
END;
$$;

-- ============ 5. Remove unused password hash column ============
ALTER TABLE public.companies DROP COLUMN IF EXISTS switch_password_hash;

-- ============ 6. Storage hardening ============
DROP POLICY IF EXISTS "Anyone can view company logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;

CREATE POLICY "Users can view their own logo uploads" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload logos to their own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'company-logos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- ============ 7. Function execution lockdown ============
REVOKE ALL ON FUNCTION public.lookup_staff_by_code(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.lookup_staff_by_code(text) TO service_role;

REVOKE ALL ON FUNCTION public.auto_create_sale_on_payment() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_is_approved() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_booking_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_conference_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_conference_booking_cancelled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_booking() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_staff() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_ready() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_payment_completed() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.create_company_with_owner(text, text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_company_with_owner(text, text, text, text, text, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_user_role(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_company_member(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_member(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_company_member_raw(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_company_member_raw(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_company_role(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_company_role(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_company_staff(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_company_staff(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.accept_invitation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.role_rank(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.role_rank(text) TO authenticated, service_role;

-- ============ 8. login_attempts: no public writes ============
DROP POLICY IF EXISTS "Anyone can insert login attempts" ON public.login_attempts;
