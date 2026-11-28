CREATE OR REPLACE FUNCTION public.is_staff_management_owner(_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.companies AS company
    WHERE company.id = _company_id
      AND (
        company.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1
          FROM public.company_members AS membership
          WHERE membership.company_id = company.id
            AND membership.user_id = auth.uid()
            AND membership.role = 'owner'
        )
      )
  );
$$;

DROP POLICY IF EXISTS "Owner can access staff document files" ON storage.objects;

CREATE POLICY "Owner can access staff document files"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1
      FROM public.companies AS company
      WHERE company.id::text = (storage.foldername(name))[1]
        AND public.is_staff_management_owner(company.id)
    )
  )
  WITH CHECK (
    bucket_id = 'staff-documents'
    AND EXISTS (
      SELECT 1
      FROM public.companies AS company
      WHERE company.id::text = (storage.foldername(name))[1]
        AND public.is_staff_management_owner(company.id)
    )
  );

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
       FROM public.companies AS company
       WHERE company.id = OLD.company_id
         AND (
           company.owner_id = OLD.user_id
           OR EXISTS (
             SELECT 1
             FROM public.company_members AS membership
             WHERE membership.company_id = company.id
               AND membership.user_id = OLD.user_id
               AND membership.role = 'owner'
           )
         )
     ) THEN
    DELETE FROM public.company_members
    WHERE company_id = OLD.company_id
      AND user_id = OLD.user_id;
  END IF;

  RETURN OLD;
END;
$$;
