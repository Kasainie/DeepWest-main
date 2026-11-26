ALTER TABLE public.company_staff
  ADD COLUMN access_permissions text[];

ALTER TABLE public.company_staff
  ADD CONSTRAINT company_staff_access_permissions_check
  CHECK (
    access_permissions IS NULL
    OR access_permissions <@ ARRAY[
      'restaurant.orders',
      'restaurant.menu',
      'kitchen.orders',
      'kitchen.inventory',
      'accounting.sales',
      'accounting.expenses',
      'accounting.inventory',
      'housekeeping.tasks',
      'housekeeping.manage'
    ]::text[]
  );

CREATE OR REPLACE FUNCTION public.staff_has_permission(
  _user_id uuid,
  _company_id uuid,
  _permission text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_staff cs
    WHERE cs.user_id = _user_id
      AND cs.company_id = _company_id
      AND cs.is_active
      AND CASE split_part(_permission, '.', 1)
        WHEN 'accounting' THEN 'accountant' = ANY(cs.department)
        ELSE split_part(_permission, '.', 1) = ANY(cs.department)
      END
      AND (
        cs.access_permissions IS NULL
        OR _permission = ANY(cs.access_permissions)
      )
  );
$$;

REVOKE ALL ON FUNCTION public.staff_has_permission(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_has_permission(uuid, uuid, text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Manager+ can insert menu" ON public.menu_items;
DROP POLICY IF EXISTS "Manager+ can update menu" ON public.menu_items;
DROP POLICY IF EXISTS "Manager+ can delete menu" ON public.menu_items;

CREATE POLICY "Managers and menu staff can insert menu"
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
    OR public.staff_has_permission(auth.uid(), company_id, 'restaurant.menu')
  );

CREATE POLICY "Managers and menu staff can update menu"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
    OR public.staff_has_permission(auth.uid(), company_id, 'restaurant.menu')
  )
  WITH CHECK (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
    OR public.staff_has_permission(auth.uid(), company_id, 'restaurant.menu')
  );

CREATE POLICY "Managers and menu staff can delete menu"
  ON public.menu_items FOR DELETE TO authenticated
  USING (
    public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
    OR public.staff_has_permission(auth.uid(), company_id, 'restaurant.menu')
  );

CREATE TABLE public.housekeeping_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  room_label text NOT NULL,
  instructions text,
  status text NOT NULL DEFAULT 'to_clean'
    CHECK (status IN ('to_clean', 'in_progress', 'clean')),
  assigned_to uuid REFERENCES public.company_staff(id) ON DELETE SET NULL,
  assigned_to_name text NOT NULL,
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX housekeeping_tasks_company_created_idx
  ON public.housekeeping_tasks (company_id, created_at DESC);

ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_housekeeping_cleaner(_staff_id uuid, _company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_staff cs
    WHERE cs.id = _staff_id
      AND cs.company_id = _company_id
      AND cs.is_active
      AND cs.role = 'cleaner'
      AND 'housekeeping' = ANY(cs.department)
      AND (
        cs.access_permissions IS NULL
        OR 'housekeeping.tasks' = ANY(cs.access_permissions)
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_housekeeping_task_assignee(
  _user_id uuid,
  _company_id uuid,
  _staff_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.company_staff cs
    WHERE cs.id = _staff_id
      AND cs.company_id = _company_id
      AND cs.user_id = _user_id
      AND cs.is_active
      AND 'housekeeping' = ANY(cs.department)
  );
$$;

REVOKE ALL ON FUNCTION public.is_housekeeping_cleaner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_housekeeping_cleaner(uuid, uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.is_housekeeping_task_assignee(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_housekeeping_task_assignee(uuid, uuid, uuid) TO authenticated, service_role;

CREATE POLICY "Assigned housekeeping staff can view tasks"
  ON public.housekeeping_tasks FOR SELECT TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
      OR public.staff_has_permission(auth.uid(), company_id, 'housekeeping.manage')
      OR (
        public.staff_has_permission(auth.uid(), company_id, 'housekeeping.tasks')
        AND public.is_housekeeping_task_assignee(auth.uid(), company_id, assigned_to)
      )
    )
  );

CREATE POLICY "Housekeeping managers can create tasks"
  ON public.housekeeping_tasks FOR INSERT TO authenticated
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND created_by = auth.uid()
    AND (
      public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
      OR public.staff_has_permission(auth.uid(), company_id, 'housekeeping.manage')
    )
    AND public.is_housekeeping_cleaner(assigned_to, company_id)
  );

CREATE POLICY "Housekeeping managers can update tasks"
  ON public.housekeeping_tasks FOR UPDATE TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
      OR public.staff_has_permission(auth.uid(), company_id, 'housekeeping.manage')
    )
  )
  WITH CHECK (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
      OR public.staff_has_permission(auth.uid(), company_id, 'housekeeping.manage')
    )
    AND public.is_housekeeping_cleaner(assigned_to, company_id)
  );

CREATE POLICY "Housekeeping managers can delete tasks"
  ON public.housekeeping_tasks FOR DELETE TO authenticated
  USING (
    public.is_company_member(auth.uid(), company_id)
    AND (
      public.get_company_role(auth.uid(), company_id) IN ('owner', 'admin', 'manager')
      OR public.staff_has_permission(auth.uid(), company_id, 'housekeeping.manage')
    )
  );

CREATE TRIGGER housekeeping_tasks_updated_at
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.list_housekeeping_cleaners(_company_id uuid)
RETURNS TABLE (staff_id uuid, full_name text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_company_member(auth.uid(), _company_id)
    OR (
      public.get_company_role(auth.uid(), _company_id) NOT IN ('owner', 'admin', 'manager')
      AND NOT public.staff_has_permission(auth.uid(), _company_id, 'housekeeping.manage')
    )
  THEN
    RAISE EXCEPTION 'You do not have permission to assign housekeeping tasks';
  END IF;

  RETURN QUERY
  SELECT cs.id, cs.full_name
  FROM public.company_staff cs
  WHERE cs.company_id = _company_id
    AND cs.is_active
    AND cs.role = 'cleaner'
    AND 'housekeeping' = ANY(cs.department)
    AND (
      cs.access_permissions IS NULL
      OR 'housekeeping.tasks' = ANY(cs.access_permissions)
    )
  ORDER BY cs.full_name;
END;
$$;

REVOKE ALL ON FUNCTION public.list_housekeeping_cleaners(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_housekeeping_cleaners(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.set_housekeeping_task_status(_task_id uuid, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_assigned_to uuid;
BEGIN
  IF _status NOT IN ('to_clean', 'in_progress', 'clean') THEN
    RAISE EXCEPTION 'Invalid housekeeping task status';
  END IF;

  SELECT t.company_id, t.assigned_to
  INTO v_company_id, v_assigned_to
  FROM public.housekeeping_tasks t
  WHERE t.id = _task_id;

  IF v_company_id IS NULL OR NOT public.is_company_member(auth.uid(), v_company_id) THEN
    RAISE EXCEPTION 'Housekeeping task not found';
  END IF;

  IF public.get_company_role(auth.uid(), v_company_id) NOT IN ('owner', 'admin', 'manager')
    AND NOT public.staff_has_permission(auth.uid(), v_company_id, 'housekeeping.manage')
    AND NOT (
      public.staff_has_permission(auth.uid(), v_company_id, 'housekeeping.tasks')
      AND public.is_housekeeping_task_assignee(auth.uid(), v_company_id, v_assigned_to)
    )
  THEN
    RAISE EXCEPTION 'You do not have permission to update this task';
  END IF;

  UPDATE public.housekeeping_tasks
  SET status = _status
  WHERE id = _task_id;
END;
$$;

REVOKE ALL ON FUNCTION public.set_housekeeping_task_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_housekeeping_task_status(uuid, text) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
