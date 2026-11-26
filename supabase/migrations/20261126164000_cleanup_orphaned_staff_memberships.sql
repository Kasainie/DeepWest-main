CREATE OR REPLACE FUNCTION public.remove_staff_membership_after_staff_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.user_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.companies
       WHERE id = OLD.company_id
         AND owner_id = OLD.user_id
     ) THEN
    DELETE FROM public.company_members
    WHERE company_id = OLD.company_id
      AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS remove_staff_membership_after_staff_delete ON public.company_staff;

CREATE TRIGGER remove_staff_membership_after_staff_delete
AFTER DELETE ON public.company_staff
FOR EACH ROW
EXECUTE FUNCTION public.remove_staff_membership_after_staff_delete();

-- Staff logins use synthetic internal.local accounts; without a matching staff
-- row, their company membership is stale and should no longer grant access.
DELETE FROM public.company_members AS membership
USING auth.users AS auth_user
WHERE auth_user.id = membership.user_id
  AND auth_user.email ILIKE 'staff-%@internal.local'
  AND NOT EXISTS (
    SELECT 1
    FROM public.company_staff AS staff
    WHERE staff.company_id = membership.company_id
      AND staff.user_id = membership.user_id
  )
  AND NOT EXISTS (
    SELECT 1
    FROM public.companies AS company
    WHERE company.id = membership.company_id
      AND company.owner_id = membership.user_id
  );
