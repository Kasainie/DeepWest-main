CREATE POLICY "Staff can delete own leave requests when enabled"
  ON public.staff_leave_requests FOR DELETE TO authenticated
  USING (
    public.staff_management_is_enabled(company_id)
    AND public.is_own_staff_management_record(company_id, staff_id)
  );
