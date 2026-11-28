import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarClock, CalendarDays, Check, Clock3, FileText, Loader2, Plus, Trash2, Upload, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Database, Tables } from "@/integrations/supabase/types";
import { formatKES } from "@/lib/currency";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type StaffRecord = Pick<
  Database["public"]["Tables"]["company_staff"]["Row"],
  "id" | "full_name" | "role" | "department" | "phone" | "is_active" | "user_id"
>;
type StaffPayment = Tables<"staff_payments">;
type LeaveRequest = Tables<"staff_leave_requests">;
type AttendanceRecord = Tables<"staff_attendance">;
type StaffShift = Tables<"staff_shifts">;
type StaffAdjustment = Tables<"staff_adjustments">;
type StaffProfile = Tables<"staff_profiles">;
type StaffDocument = Tables<"staff_documents">;

const fieldClass =
  "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const dateTimeLabel = (value: string) => new Date(value).toLocaleString();
const statusVariant = (status: string): "default" | "destructive" | "secondary" =>
  status === "approved" || status === "paid" ? "default" : status === "rejected" ? "destructive" : "secondary";

async function uploadStaffDocument(
  companyId: string,
  staffId: string,
  file: File,
  documentType: string,
  userId: string | undefined,
) {
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Choose a file smaller than 10 MB");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${companyId}/${staffId}/${crypto.randomUUID()}-${safeName}`;
  const { error: uploadError } = await supabase.storage
    .from("staff-documents")
    .upload(storagePath, file, { contentType: file.type || undefined });
  if (uploadError) throw uploadError;

  const { error: recordError } = await supabase.from("staff_documents").insert({
    company_id: companyId,
    staff_id: staffId,
    file_name: file.name,
    document_type: documentType,
    storage_path: storagePath,
    uploaded_by: userId ?? null,
  });
  if (recordError) {
    const { error: cleanupError } = await supabase.storage
      .from("staff-documents")
      .remove([storagePath]);
    if (cleanupError) {
      throw new Error(`${recordError.message}. Uploaded file cleanup failed: ${cleanupError.message}`);
    }
    throw recordError;
  }
}

async function openStaffDocument(storagePath: string) {
  const { data, error } = await supabase.storage
    .from("staff-documents")
    .createSignedUrl(storagePath, 60);
  if (error) throw error;
  window.location.assign(data.signedUrl);
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)} className="capitalize">{status}</Badge>;
}

export function OwnerStaffOperations({
  companyId,
  staffList,
}: {
  companyId: string;
  staffList: StaffRecord[];
}) {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [staffId, setStaffId] = useState("");
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [adjustments, setAdjustments] = useState<StaffAdjustment[]>([]);
  const [profiles, setProfiles] = useState<StaffProfile[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [paymentForm, setPaymentForm] = useState({
    pay_period_start: "",
    pay_period_end: "",
    amount: "",
    payment_date: today(),
    payment_method: "cash",
    reference: "",
    notes: "",
  });
  const [shiftForm, setShiftForm] = useState({ starts_at: "", ends_at: "", notes: "" });
  const [adjustmentForm, setAdjustmentForm] = useState({
    adjustment_type: "deduction",
    amount: "",
    effective_date: today(),
    reason: "",
  });
  const [profileForm, setProfileForm] = useState({
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [
      settingsResult,
      paymentsResult,
      leaveResult,
      attendanceResult,
      shiftsResult,
      adjustmentsResult,
      profilesResult,
      documentsResult,
    ] = await Promise.all([
      supabase.from("staff_management_settings").select("enabled").eq("company_id", companyId).maybeSingle(),
      supabase.from("staff_payments").select("*").eq("company_id", companyId).order("payment_date", { ascending: false }),
      supabase.from("staff_leave_requests").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("staff_attendance").select("*").eq("company_id", companyId).order("clocked_in_at", { ascending: false }).limit(200),
      supabase.from("staff_shifts").select("*").eq("company_id", companyId).order("starts_at", { ascending: false }),
      supabase.from("staff_adjustments").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
      supabase.from("staff_profiles").select("*").eq("company_id", companyId),
      supabase.from("staff_documents").select("*").eq("company_id", companyId).order("created_at", { ascending: false }),
    ]);

    const firstError = [
      settingsResult.error,
      paymentsResult.error,
      leaveResult.error,
      attendanceResult.error,
      shiftsResult.error,
      adjustmentsResult.error,
      profilesResult.error,
      documentsResult.error,
    ].find(Boolean);
    if (firstError) {
      toast.error(`Couldn't load staff records: ${firstError.message}`);
    } else {
      setEnabled(settingsResult.data?.enabled ?? false);
      setPayments(paymentsResult.data ?? []);
      setLeaveRequests(leaveResult.data ?? []);
      setAttendance(attendanceResult.data ?? []);
      setShifts(shiftsResult.data ?? []);
      setAdjustments(adjustmentsResult.data ?? []);
      setProfiles(profilesResult.data ?? []);
      setDocuments(documentsResult.data ?? []);
    }
    setLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (staffList.length > 0 && !staffList.some((member) => member.id === staffId)) {
      setStaffId(staffList.find((member) => member.is_active)?.id ?? staffList[0].id);
    }
  }, [staffList, staffId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    const profile = profiles.find((row) => row.staff_id === staffId);
    setProfileForm({
      address: profile?.address ?? "",
      emergency_contact_name: profile?.emergency_contact_name ?? "",
      emergency_contact_phone: profile?.emergency_contact_phone ?? "",
    });
  }, [profiles, staffId]);

  const toggleEnabled = async (value: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("staff_management_settings").upsert(
      { company_id: companyId, enabled: value, updated_at: new Date().toISOString() },
      { onConflict: "company_id" },
    );
    if (error) {
      toast.error(`Couldn't update staff self-service: ${error.message}`);
    } else {
      setEnabled(value);
      toast.success(value ? "Staff self-service enabled" : "Staff self-service disabled");
    }
    setSaving(false);
  };

  const savePayment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(paymentForm.amount);
    if (!staffId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Choose a staff member and enter a valid payment amount");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("staff_payments").insert({
      company_id: companyId,
      staff_id: staffId,
      pay_period_start: paymentForm.pay_period_start,
      pay_period_end: paymentForm.pay_period_end,
      amount,
      payment_date: paymentForm.payment_date,
      payment_method: paymentForm.payment_method,
      reference: paymentForm.reference.trim() || null,
      notes: paymentForm.notes.trim() || null,
      recorded_by: user?.id ?? null,
    });
    if (error) toast.error(`Couldn't record payment: ${error.message}`);
    else {
      toast.success("Payment recorded");
      setPaymentForm((current) => ({ ...current, amount: "", reference: "", notes: "" }));
      await loadData();
    }
    setSaving(false);
  };

  const reviewLeave = async (request: LeaveRequest, status: "approved" | "rejected") => {
    setSaving(true);
    const { error } = await supabase.from("staff_leave_requests").update({
      status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request.id);
    if (error) toast.error(`Couldn't update leave request: ${error.message}`);
    else {
      toast.success(`Leave request ${status}`);
      await loadData();
    }
    setSaving(false);
  };

  const deleteLeaveRequest = async (request: LeaveRequest) => {
    if (!window.confirm(`Permanently delete ${request.leave_type} leave (${request.start_date} to ${request.end_date}), even if approved?`)) return;
    setSaving(true);
    const { error } = await supabase
      .from("staff_leave_requests")
      .delete()
      .eq("company_id", companyId)
      .eq("id", request.id)
      .select("id")
      .single();
    if (error) toast.error(`Couldn't delete leave request: ${error.message}`);
    else {
      toast.success("Leave request deleted");
      await loadData();
    }
    setSaving(false);
  };

  const saveShift = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staffList.find((member) => member.id === staffId)?.is_active) {
      toast.error("Choose an active staff member for a shift");
      return;
    }
    if (!staffId || new Date(shiftForm.ends_at) <= new Date(shiftForm.starts_at)) {
      toast.error("Choose a staff member and an end time after the start time");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("staff_shifts").insert({
      company_id: companyId,
      staff_id: staffId,
      starts_at: new Date(shiftForm.starts_at).toISOString(),
      ends_at: new Date(shiftForm.ends_at).toISOString(),
      notes: shiftForm.notes.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) toast.error(`Couldn't schedule shift: ${error.message}`);
    else {
      toast.success("Shift scheduled");
      setShiftForm({ starts_at: "", ends_at: "", notes: "" });
      await loadData();
    }
    setSaving(false);
  };

  const removeShift = async (shiftId: string) => {
    if (!window.confirm("Remove this shift?")) return;
    const { error } = await supabase.from("staff_shifts").delete().eq("id", shiftId);
    if (error) toast.error(`Couldn't remove shift: ${error.message}`);
    else {
      toast.success("Shift removed");
      await loadData();
    }
  };

  const saveAdjustment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(adjustmentForm.amount);
    if (!staffId || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Choose a staff member and enter a valid amount");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("staff_adjustments").insert({
      company_id: companyId,
      staff_id: staffId,
      adjustment_type: adjustmentForm.adjustment_type,
      amount,
      effective_date: adjustmentForm.effective_date,
      reason: adjustmentForm.reason.trim(),
      status: "approved",
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    });
    if (error) toast.error(`Couldn't record adjustment: ${error.message}`);
    else {
      toast.success("Adjustment recorded");
      setAdjustmentForm((current) => ({ ...current, amount: "", reason: "" }));
      await loadData();
    }
    setSaving(false);
  };

  const reviewAdjustment = async (adjustment: StaffAdjustment, status: "approved" | "rejected") => {
    setSaving(true);
    const { error } = await supabase.from("staff_adjustments").update({
      status,
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    }).eq("id", adjustment.id);
    if (error) toast.error(`Couldn't update advance request: ${error.message}`);
    else {
      toast.success(`Advance request ${status}`);
      await loadData();
    }
    setSaving(false);
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staffId) {
      toast.error("Choose a staff member");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("staff_profiles").upsert({
      company_id: companyId,
      staff_id: staffId,
      ...profileForm,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,staff_id" });
    if (error) toast.error(`Couldn't save staff profile: ${error.message}`);
    else {
      toast.success("Staff profile saved");
      await loadData();
    }
    setSaving(false);
  };

  const uploadOwnerDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = (formElement.elements.namedItem("staff-document") as HTMLInputElement).files?.[0];
    const type = (formElement.elements.namedItem("document-type") as HTMLSelectElement).value;
    if (!file || !staffId) {
      toast.error("Choose a staff member and a document");
      return;
    }
    setSaving(true);
    try {
      await uploadStaffDocument(companyId, staffId, file, type, user?.id);
      toast.success("Staff document uploaded");
      formElement.reset();
      await loadData();
    } catch (error) {
      toast.error(`Couldn't upload document: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setSaving(false);
  };

  const deleteOwnerDocument = async (document: StaffDocument) => {
    if (!window.confirm(`Delete ${document.file_name}?`)) return;
    const { error: fileError } = await supabase.storage
      .from("staff-documents")
      .remove([document.storage_path]);
    if (fileError) {
      toast.error(`Couldn't delete document file: ${fileError.message}`);
      return;
    }
    const { error: recordError } = await supabase.from("staff_documents").delete().eq("id", document.id);
    if (recordError) {
      toast.error(`File deleted, but its record could not be removed: ${recordError.message}`);
    } else {
      toast.success("Document deleted");
      await loadData();
    }
  };

  const staffName = (id: string) => staffList.find((member) => member.id === id)?.full_name ?? "Staff member";
  const selectedDocuments = documents.filter((document) => document.staff_id === staffId);

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="font-display">Staff Operations</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Payroll records, leave, attendance, shifts, advances, and staff documents.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border px-3 py-2">
          <div>
            <p className="text-sm font-medium">Staff self-service</p>
            <p className="text-xs text-muted-foreground">{enabled ? "Available to staff" : "Currently off"}</p>
          </div>
          <Switch checked={enabled} onCheckedChange={toggleEnabled} disabled={saving} aria-label="Toggle staff self-service" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!enabled && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
            Staff see a Coming Soon notice until you enable self-service. You can still manage all records below.
          </div>
        )}
        {staffList.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Add staff members before setting up staff operations.
          </p>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex h-auto flex-wrap justify-start gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
              <TabsTrigger value="leave">Leave</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
              <TabsTrigger value="shifts">Shifts</TabsTrigger>
              <TabsTrigger value="advances">Advances</TabsTrigger>
              <TabsTrigger value="profiles">Profiles & Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card><CardContent className="flex items-center gap-3 p-4"><Wallet className="h-5 w-5 text-primary" /><div><p className="text-lg font-semibold">{payments.length}</p><p className="text-xs text-muted-foreground">Payments recorded</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><CalendarDays className="h-5 w-5 text-primary" /><div><p className="text-lg font-semibold">{leaveRequests.filter((request) => request.status === "pending").length}</p><p className="text-xs text-muted-foreground">Leave requests to review</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><Clock3 className="h-5 w-5 text-primary" /><div><p className="text-lg font-semibold">{attendance.filter((record) => !record.clocked_out_at).length}</p><p className="text-xs text-muted-foreground">Currently clocked in</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><CalendarClock className="h-5 w-5 text-primary" /><div><p className="text-lg font-semibold">{shifts.length}</p><p className="text-xs text-muted-foreground">Shifts scheduled</p></div></CardContent></Card>
            </TabsContent>

            <TabsContent value="payments" className="space-y-4">
              <form onSubmit={savePayment} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Staff member</Label><select className={fieldClass} value={staffId} onChange={(event) => setStaffId(event.target.value)} required>{staffList.map((member) => <option key={member.id} value={member.id}>{member.full_name}{member.is_active ? "" : " (inactive)"}</option>)}</select></div>
                <div className="space-y-1"><Label>Amount (KES)</Label><Input type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Period start</Label><Input type="date" value={paymentForm.pay_period_start} onChange={(event) => setPaymentForm({ ...paymentForm, pay_period_start: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Period end</Label><Input type="date" value={paymentForm.pay_period_end} onChange={(event) => setPaymentForm({ ...paymentForm, pay_period_end: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Payment date</Label><Input type="date" value={paymentForm.payment_date} onChange={(event) => setPaymentForm({ ...paymentForm, payment_date: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Method</Label><select className={fieldClass} value={paymentForm.payment_method} onChange={(event) => setPaymentForm({ ...paymentForm, payment_method: event.target.value })}><option value="cash">Cash</option><option value="bank_transfer">Bank transfer</option><option value="mobile_money">Mobile money</option><option value="cheque">Cheque</option><option value="other">Other</option></select></div>
                <div className="space-y-1"><Label>Reference</Label><Input value={paymentForm.reference} onChange={(event) => setPaymentForm({ ...paymentForm, reference: event.target.value })} /></div>
                <div className="space-y-1"><Label>Notes</Label><Input value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} /></div>
                <Button type="submit" className="sm:col-span-2 lg:col-span-4" disabled={saving}><Plus className="mr-2 h-4 w-4" />Record payment</Button>
              </form>
              <div className="space-y-2">
                {payments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No payments recorded.</p> : payments.map((payment) => (
                  <div key={payment.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-medium">{staffName(payment.staff_id)} · {formatKES(Number(payment.amount))}</p><p className="text-xs text-muted-foreground">{payment.pay_period_start} to {payment.pay_period_end} · paid {payment.payment_date} by {payment.payment_method.replace("_", " ")}</p></div>
                    <span className="text-xs text-muted-foreground">{payment.reference || payment.notes || "—"}</span>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="leave" className="space-y-2">
              {leaveRequests.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No leave requests yet.</p> : leaveRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{staffName(request.staff_id)}</p><Badge variant="outline" className="capitalize">{request.leave_type}</Badge><StatusBadge status={request.status} /></div><p className="text-sm">{request.start_date} to {request.end_date}</p><p className="text-xs text-muted-foreground">{request.reason}</p></div>
                  <div className="flex gap-2">
                    {request.status === "pending" && <>
                      <Button size="sm" onClick={() => reviewLeave(request, "approved")} disabled={saving}><Check className="mr-1 h-4 w-4" />Approve</Button>
                      <Button size="sm" variant="outline" onClick={() => reviewLeave(request, "rejected")} disabled={saving}><X className="mr-1 h-4 w-4" />Decline</Button>
                    </>}
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteLeaveRequest(request)} disabled={saving}>
                      <Trash2 className="mr-1 h-4 w-4" />Delete
                    </Button>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="attendance" className="space-y-2">
              {attendance.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No attendance records yet.</p> : attendance.map((record) => (
                <div key={record.id} className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-medium">{staffName(record.staff_id)}</p><p className="text-sm text-muted-foreground">In {dateTimeLabel(record.clocked_in_at)}{record.clocked_out_at ? ` · Out ${dateTimeLabel(record.clocked_out_at)}` : " · Currently working"}</p>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="shifts" className="space-y-4">
              <form onSubmit={saveShift} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Staff member</Label><select className={fieldClass} value={staffId} onChange={(event) => setStaffId(event.target.value)} required>{staffList.map((member) => <option key={member.id} value={member.id}>{member.full_name}{member.is_active ? "" : " (inactive)"}</option>)}</select></div>
                <div className="space-y-1"><Label>Starts</Label><Input type="datetime-local" value={shiftForm.starts_at} onChange={(event) => setShiftForm({ ...shiftForm, starts_at: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Ends</Label><Input type="datetime-local" value={shiftForm.ends_at} onChange={(event) => setShiftForm({ ...shiftForm, ends_at: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Notes</Label><Input value={shiftForm.notes} onChange={(event) => setShiftForm({ ...shiftForm, notes: event.target.value })} /></div>
                <Button type="submit" className="sm:col-span-2 lg:col-span-4" disabled={saving}><Plus className="mr-2 h-4 w-4" />Schedule shift</Button>
              </form>
              <div className="space-y-2">
                {shifts.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No shifts scheduled.</p> : shifts.map((shift) => (
                  <div key={shift.id} className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-medium">{staffName(shift.staff_id)}</p><p className="text-sm text-muted-foreground">{dateTimeLabel(shift.starts_at)} – {dateTimeLabel(shift.ends_at)}</p>{shift.notes && <p className="text-xs text-muted-foreground">{shift.notes}</p>}</div>
                    <Button size="sm" variant="outline" onClick={() => removeShift(shift.id)}>Remove</Button>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="advances" className="space-y-4">
              <form onSubmit={saveAdjustment} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1"><Label>Staff member</Label><select className={fieldClass} value={staffId} onChange={(event) => setStaffId(event.target.value)} required>{staffList.map((member) => <option key={member.id} value={member.id}>{member.full_name}{member.is_active ? "" : " (inactive)"}</option>)}</select></div>
                <div className="space-y-1"><Label>Type</Label><select className={fieldClass} value={adjustmentForm.adjustment_type} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, adjustment_type: event.target.value })}><option value="deduction">Deduction</option><option value="advance">Advance</option></select></div>
                <div className="space-y-1"><Label>Amount (KES)</Label><Input type="number" min="0.01" step="0.01" value={adjustmentForm.amount} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, amount: event.target.value })} required /></div>
                <div className="space-y-1"><Label>Date</Label><Input type="date" value={adjustmentForm.effective_date} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, effective_date: event.target.value })} required /></div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-4"><Label>Reason</Label><Input value={adjustmentForm.reason} onChange={(event) => setAdjustmentForm({ ...adjustmentForm, reason: event.target.value })} required /></div>
                <Button type="submit" className="sm:col-span-2 lg:col-span-4" disabled={saving}><Plus className="mr-2 h-4 w-4" />Record adjustment</Button>
              </form>
              <div className="space-y-2">
                {adjustments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No advances or deductions recorded.</p> : adjustments.map((adjustment) => (
                  <div key={adjustment.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><div className="flex flex-wrap items-center gap-2"><p className="font-medium">{staffName(adjustment.staff_id)} · {formatKES(Number(adjustment.amount))}</p><Badge variant="outline" className="capitalize">{adjustment.adjustment_type}</Badge><StatusBadge status={adjustment.status} /></div><p className="text-xs text-muted-foreground">{adjustment.effective_date} · {adjustment.reason}</p></div>
                    {adjustment.adjustment_type === "advance" && adjustment.status === "pending" && <div className="flex gap-2"><Button size="sm" onClick={() => reviewAdjustment(adjustment, "approved")} disabled={saving}><Check className="mr-1 h-4 w-4" />Approve</Button><Button size="sm" variant="outline" onClick={() => reviewAdjustment(adjustment, "rejected")} disabled={saving}><X className="mr-1 h-4 w-4" />Decline</Button></div>}
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="profiles" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <form onSubmit={saveProfile} className="space-y-3 rounded-lg border p-4">
                  <div className="space-y-1"><Label>Staff member</Label><select className={fieldClass} value={staffId} onChange={(event) => setStaffId(event.target.value)} required>{staffList.map((member) => <option key={member.id} value={member.id}>{member.full_name}{member.is_active ? "" : " (inactive)"}</option>)}</select></div>
                  <div className="space-y-1"><Label>Address</Label><Textarea value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} /></div>
                  <div className="space-y-1"><Label>Emergency contact name</Label><Input value={profileForm.emergency_contact_name} onChange={(event) => setProfileForm({ ...profileForm, emergency_contact_name: event.target.value })} /></div>
                  <div className="space-y-1"><Label>Emergency contact phone</Label><Input value={profileForm.emergency_contact_phone} onChange={(event) => setProfileForm({ ...profileForm, emergency_contact_phone: event.target.value })} /></div>
                  <Button type="submit" disabled={saving}>Save profile</Button>
                </form>
                <div className="space-y-4 rounded-lg border p-4">
                  <h3 className="font-medium">Documents · {staffList.find((member) => member.id === staffId)?.full_name}</h3>
                  <form onSubmit={uploadOwnerDocument} className="space-y-3">
                    <div className="space-y-1"><Label>Document type</Label><select name="document-type" className={fieldClass}><option value="contract">Contract</option><option value="identification">Identification</option><option value="certificate">Certificate</option><option value="other">Other</option></select></div>
                    <div className="space-y-1"><Label>Choose file (up to 10 MB)</Label><Input name="staff-document" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required /></div>
                    <Button type="submit" variant="outline" disabled={saving}><Upload className="mr-2 h-4 w-4" />Upload document</Button>
                  </form>
                  <div className="space-y-2">
                    {selectedDocuments.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : selectedDocuments.map((document) => (
                      <div key={document.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2">
                        <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate text-sm">{document.file_name}</span><Badge variant="outline" className="capitalize">{document.document_type}</Badge></div>
                        <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => void openStaffDocument(document.storage_path).catch((error: unknown) => toast.error(`Couldn't open document: ${error instanceof Error ? error.message : "Unknown error"}`))}>Open</Button><Button size="sm" variant="ghost" onClick={() => void deleteOwnerDocument(document)}>Delete</Button></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}

export function StaffSelfService({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [staff, setStaff] = useState<StaffRecord | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [payments, setPayments] = useState<StaffPayment[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [adjustments, setAdjustments] = useState<StaffAdjustment[]>([]);
  const [documents, setDocuments] = useState<StaffDocument[]>([]);
  const [busy, setBusy] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [advanceForm, setAdvanceForm] = useState({ amount: "", effective_date: today(), reason: "" });
  const [profileForm, setProfileForm] = useState({
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
  });

  const clearPrivateRecords = useCallback(() => {
    setEnabled(false);
    setStaff(null);
    setProfile(null);
    setPayments([]);
    setLeaveRequests([]);
    setAttendance([]);
    setShifts([]);
    setAdjustments([]);
    setDocuments([]);
  }, []);

  const loadWorkspace = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const { data: setting, error: settingsError } = await supabase
      .from("staff_management_settings")
      .select("enabled")
      .eq("company_id", companyId)
      .maybeSingle();
    if (settingsError) {
      toast.error(`Couldn't check staff self-service: ${settingsError.message}`);
      clearPrivateRecords();
      setLoadError(settingsError.message);
      setLoading(false);
      return;
    }

    const isEnabled = setting?.enabled ?? false;
    setEnabled(isEnabled);
    if (!isEnabled) {
      clearPrivateRecords();
      setLoading(false);
      return;
    }
    if (!user) {
      toast.error("Sign in again to access staff self-service");
      clearPrivateRecords();
      setLoadError("Your login session is unavailable. Please sign in again.");
      setLoading(false);
      return;
    }

    const { data: staffData, error: staffError } = await supabase
      .from("company_staff")
      .select("id, full_name, role, department, phone, is_active, user_id")
      .eq("company_id", companyId)
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    if (staffError) {
      toast.error(`Couldn't load your staff profile: ${staffError.message}`);
      clearPrivateRecords();
      setLoadError(staffError.message);
      setLoading(false);
      return;
    }
    if (!staffData) {
      clearPrivateRecords();
      setEnabled(true);
      setLoading(false);
      return;
    }
    setStaff(staffData);

    const [
      profileResult,
      paymentsResult,
      leaveResult,
      attendanceResult,
      shiftsResult,
      adjustmentsResult,
      documentsResult,
    ] = await Promise.all([
      supabase.from("staff_profiles").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).maybeSingle(),
      supabase.from("staff_payments").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).order("payment_date", { ascending: false }),
      supabase.from("staff_leave_requests").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).order("created_at", { ascending: false }),
      supabase.from("staff_attendance").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).order("clocked_in_at", { ascending: false }).limit(100),
      supabase.from("staff_shifts").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).order("starts_at", { ascending: true }),
      supabase.from("staff_adjustments").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).order("created_at", { ascending: false }),
      supabase.from("staff_documents").select("*").eq("company_id", companyId).eq("staff_id", staffData.id).order("created_at", { ascending: false }),
    ]);

    const firstError = [
      profileResult.error,
      paymentsResult.error,
      leaveResult.error,
      attendanceResult.error,
      shiftsResult.error,
      adjustmentsResult.error,
      documentsResult.error,
    ].find(Boolean);
    if (firstError) {
      toast.error(`Couldn't load your staff records: ${firstError.message}`);
      clearPrivateRecords();
      setLoadError(firstError.message);
    } else {
      setProfile(profileResult.data);
      setPayments(paymentsResult.data ?? []);
      setLeaveRequests(leaveResult.data ?? []);
      setAttendance(attendanceResult.data ?? []);
      setShifts(shiftsResult.data ?? []);
      setAdjustments(adjustmentsResult.data ?? []);
      setDocuments(documentsResult.data ?? []);
      setProfileForm({
        address: profileResult.data?.address ?? "",
        emergency_contact_name: profileResult.data?.emergency_contact_name ?? "",
        emergency_contact_phone: profileResult.data?.emergency_contact_phone ?? "",
      });
    }
    setLoading(false);
  }, [clearPrivateRecords, companyId, user]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    const refreshIfAvailabilityChanged = async () => {
      const { data, error } = await supabase
        .from("staff_management_settings")
        .select("enabled")
        .eq("company_id", companyId)
        .maybeSingle();
      if (error) {
        clearPrivateRecords();
        setLoadError(error.message);
        toast.error(`Couldn't check staff self-service: ${error.message}`);
      } else if ((data?.enabled ?? false) !== enabled) {
        void loadWorkspace();
      }
    };
    const interval = window.setInterval(refreshIfAvailabilityChanged, 15000);
    window.addEventListener("focus", refreshIfAvailabilityChanged);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshIfAvailabilityChanged);
    };
  }, [clearPrivateRecords, companyId, enabled, loadWorkspace]);

  const requestLeave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff || new Date(leaveForm.end_date) < new Date(leaveForm.start_date)) {
      toast.error("Choose valid leave dates");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("staff_leave_requests").insert({
      company_id: companyId,
      staff_id: staff.id,
      leave_type: leaveForm.leave_type,
      start_date: leaveForm.start_date,
      end_date: leaveForm.end_date,
      reason: leaveForm.reason.trim(),
      status: "pending",
    });
    if (error) toast.error(`Couldn't submit leave request: ${error.message}`);
    else {
      toast.success("Leave request submitted");
      setLeaveForm({ ...leaveForm, start_date: "", end_date: "", reason: "" });
      await loadWorkspace();
    }
    setBusy(false);
  };

  const cancelLeave = async (request: LeaveRequest) => {
    const { error } = await supabase.from("staff_leave_requests").update({ status: "cancelled" }).eq("id", request.id);
    if (error) toast.error(`Couldn't cancel leave request: ${error.message}`);
    else {
      toast.success("Leave request cancelled");
      await loadWorkspace();
    }
  };

  const deleteLeaveRequest = async (request: LeaveRequest) => {
    if (!staff) return;
    if (!window.confirm(`Permanently delete your ${request.leave_type} leave request (${request.start_date} to ${request.end_date}), even if approved?`)) return;
    setBusy(true);
    const { error } = await supabase
      .from("staff_leave_requests")
      .delete()
      .eq("company_id", companyId)
      .eq("staff_id", staff.id)
      .eq("id", request.id)
      .select("id")
      .single();
    if (error) toast.error(`Couldn't delete leave request: ${error.message}`);
    else {
      toast.success("Leave request deleted");
      await loadWorkspace();
    }
    setBusy(false);
  };

  const clockAction = async () => {
    if (!staff) return;
    const openRecord = attendance.find((record) => !record.clocked_out_at);
    setBusy(true);
    const { error } = openRecord
      ? await supabase.rpc("staff_clock_out", { _attendance_id: openRecord.id })
      : await supabase.rpc("staff_clock_in", { _staff_id: staff.id });
    if (error) toast.error(`Couldn't update attendance: ${error.message}`);
    else {
      toast.success(openRecord ? "Clocked out" : "Clocked in");
      await loadWorkspace();
    }
    setBusy(false);
  };

  const requestAdvance = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const amount = Number(advanceForm.amount);
    if (!staff || !Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid advance amount");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("staff_adjustments").insert({
      company_id: companyId,
      staff_id: staff.id,
      adjustment_type: "advance",
      amount,
      effective_date: advanceForm.effective_date,
      reason: advanceForm.reason.trim(),
      status: "pending",
    });
    if (error) toast.error(`Couldn't request advance: ${error.message}`);
    else {
      toast.success("Advance request submitted");
      setAdvanceForm({ amount: "", effective_date: today(), reason: "" });
      await loadWorkspace();
    }
    setBusy(false);
  };

  const cancelAdvance = async (adjustment: StaffAdjustment) => {
    const { error } = await supabase.from("staff_adjustments").update({ status: "cancelled" }).eq("id", adjustment.id);
    if (error) toast.error(`Couldn't cancel advance request: ${error.message}`);
    else {
      toast.success("Advance request cancelled");
      await loadWorkspace();
    }
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!staff) return;
    setBusy(true);
    const { error } = await supabase.from("staff_profiles").upsert({
      company_id: companyId,
      staff_id: staff.id,
      ...profileForm,
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,staff_id" });
    if (error) toast.error(`Couldn't save your profile: ${error.message}`);
    else {
      toast.success("Profile saved");
      await loadWorkspace();
    }
    setBusy(false);
  };

  const uploadOwnDocument = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const file = (formElement.elements.namedItem("staff-document") as HTMLInputElement).files?.[0];
    const type = (formElement.elements.namedItem("document-type") as HTMLSelectElement).value;
    if (!file || !staff) {
      toast.error("Choose a document to upload");
      return;
    }
    setBusy(true);
    try {
      await uploadStaffDocument(companyId, staff.id, file, type, user?.id);
      toast.success("Document uploaded");
      formElement.reset();
      await loadWorkspace();
    } catch (error) {
      toast.error(`Couldn't upload document: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    setBusy(false);
  };

  const deleteOwnDocument = async (document: StaffDocument) => {
    const { error: fileError } = await supabase.storage.from("staff-documents").remove([document.storage_path]);
    if (fileError) {
      toast.error(`Couldn't delete document file: ${fileError.message}`);
      return;
    }
    const { error: recordError } = await supabase.from("staff_documents").delete().eq("id", document.id);
    if (recordError) toast.error(`File deleted, but its record could not be removed: ${recordError.message}`);
    else {
      toast.success("Document deleted");
      await loadWorkspace();
    }
  };

  if (loading) {
    return <div className="flex min-h-[300px] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (loadError) {
    return (
      <Card className="mx-auto mt-10 max-w-xl text-center">
        <CardContent className="space-y-3 p-8">
          <h1 className="text-xl font-bold font-display">Staff Center unavailable</h1>
          <p className="text-sm text-muted-foreground">{loadError}</p>
        </CardContent>
      </Card>
    );
  }

  if (!enabled) {
    return (
      <Card className="mx-auto mt-10 max-w-xl border-dashed text-center">
        <CardContent className="space-y-3 p-8">
          <CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="text-2xl font-bold font-display">Staff Center · Coming Soon</h1>
          <p className="text-sm text-muted-foreground">
            Your owner is preparing staff self-service. When it is enabled, you can view your pay records,
            request leave or advances, clock in and out, check your shifts, and manage your profile documents here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!staff) {
    return (
      <Card className="mx-auto mt-10 max-w-xl text-center">
        <CardContent className="space-y-3 p-8">
          <h1 className="text-xl font-bold font-display">Staff profile not linked</h1>
          <p className="text-sm text-muted-foreground">
            Ask the owner to link your login to your staff record before using staff self-service.
          </p>
        </CardContent>
      </Card>
    );
  }

  const openAttendance = attendance.find((record) => !record.clocked_out_at);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display">My Staff Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">{staff.full_name} · {staff.role}</p>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="payments">My Payments</TabsTrigger>
          <TabsTrigger value="leave">Leave</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="shifts">My Shifts</TabsTrigger>
          <TabsTrigger value="advances">Advances</TabsTrigger>
          <TabsTrigger value="profile">Profile & Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card><CardContent className="p-4"><p className="text-lg font-semibold">{payments.length}</p><p className="text-xs text-muted-foreground">Payment records</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-lg font-semibold">{leaveRequests.filter((request) => request.status === "pending").length}</p><p className="text-xs text-muted-foreground">Leave requests pending</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-lg font-semibold">{shifts.length}</p><p className="text-xs text-muted-foreground">Scheduled shifts</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-lg font-semibold">{adjustments.filter((entry) => entry.adjustment_type === "advance" && entry.status === "pending").length}</p><p className="text-xs text-muted-foreground">Advance requests pending</p></CardContent></Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-2">
          {payments.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No payment records yet.</p> : payments.map((payment) => (
            <Card key={payment.id}><CardContent className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold">{formatKES(Number(payment.amount))}</p><p className="text-sm text-muted-foreground">Period {payment.pay_period_start} to {payment.pay_period_end}</p></div><p className="text-sm text-muted-foreground">Paid {payment.payment_date} · {payment.payment_method.replace("_", " ")}</p></CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          <form onSubmit={requestLeave} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1"><Label>Type</Label><select className={fieldClass} value={leaveForm.leave_type} onChange={(event) => setLeaveForm({ ...leaveForm, leave_type: event.target.value })}><option value="annual">Annual</option><option value="sick">Sick</option><option value="unpaid">Unpaid</option><option value="other">Other</option></select></div>
            <div className="space-y-1"><Label>Start date</Label><Input type="date" value={leaveForm.start_date} onChange={(event) => setLeaveForm({ ...leaveForm, start_date: event.target.value })} required /></div>
            <div className="space-y-1"><Label>End date</Label><Input type="date" value={leaveForm.end_date} onChange={(event) => setLeaveForm({ ...leaveForm, end_date: event.target.value })} required /></div>
            <div className="space-y-1 lg:col-span-2"><Label>Reason</Label><Input value={leaveForm.reason} onChange={(event) => setLeaveForm({ ...leaveForm, reason: event.target.value })} required /></div>
            <Button className="sm:col-span-2 lg:col-span-5" type="submit" disabled={busy}>Submit leave request</Button>
          </form>
          <div className="space-y-2">
            {leaveRequests.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Your leave requests will appear here.</p> : leaveRequests.map((request) => (
              <Card key={request.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-medium capitalize">{request.leave_type} leave</p><StatusBadge status={request.status} /></div><p className="text-sm">{request.start_date} to {request.end_date}</p><p className="text-xs text-muted-foreground">{request.reason}</p></div><div className="flex gap-2">{request.status === "pending" && <Button size="sm" variant="outline" onClick={() => void cancelLeave(request)} disabled={busy}>Cancel request</Button>}<Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => void deleteLeaveRequest(request)} disabled={busy}><Trash2 className="mr-1 h-4 w-4" />Delete</Button></div></CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card><CardContent className="flex flex-col items-center gap-3 p-6 text-center">
            <Clock3 className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">{openAttendance ? `Clocked in at ${dateTimeLabel(openAttendance.clocked_in_at)}` : "You are currently clocked out."}</p>
            <Button onClick={clockAction} disabled={busy}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{openAttendance ? "Clock out" : "Clock in"}</Button>
          </CardContent></Card>
          <div className="space-y-2">
            {attendance.map((record) => <Card key={record.id}><CardContent className="p-3 text-sm">In {dateTimeLabel(record.clocked_in_at)}{record.clocked_out_at ? ` · Out ${dateTimeLabel(record.clocked_out_at)}` : " · Open"}</CardContent></Card>)}
          </div>
        </TabsContent>

        <TabsContent value="shifts" className="space-y-2">
          {shifts.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">No shifts scheduled.</p> : shifts.map((shift) => (
            <Card key={shift.id}><CardContent className="p-4"><p className="font-medium">{dateTimeLabel(shift.starts_at)} – {dateTimeLabel(shift.ends_at)}</p>{shift.notes && <p className="mt-1 text-sm text-muted-foreground">{shift.notes}</p>}</CardContent></Card>
          ))}
        </TabsContent>

        <TabsContent value="advances" className="space-y-4">
          <form onSubmit={requestAdvance} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
            <div className="space-y-1"><Label>Amount (KES)</Label><Input type="number" min="0.01" step="0.01" value={advanceForm.amount} onChange={(event) => setAdvanceForm({ ...advanceForm, amount: event.target.value })} required /></div>
            <div className="space-y-1"><Label>Needed by</Label><Input type="date" value={advanceForm.effective_date} onChange={(event) => setAdvanceForm({ ...advanceForm, effective_date: event.target.value })} required /></div>
            <div className="space-y-1"><Label>Reason</Label><Input value={advanceForm.reason} onChange={(event) => setAdvanceForm({ ...advanceForm, reason: event.target.value })} required /></div>
            <Button className="sm:col-span-3" type="submit" disabled={busy}>Request advance</Button>
          </form>
          <div className="space-y-2">
            {adjustments.filter((entry) => entry.adjustment_type === "advance").map((adjustment) => (
              <Card key={adjustment.id}><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><p className="font-medium">{formatKES(Number(adjustment.amount))}</p><StatusBadge status={adjustment.status} /></div><p className="text-xs text-muted-foreground">{adjustment.effective_date} · {adjustment.reason}</p></div>{adjustment.status === "pending" && <Button size="sm" variant="outline" onClick={() => void cancelAdvance(adjustment)}>Cancel request</Button>}</CardContent></Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="profile" className="grid gap-4 lg:grid-cols-2">
          <form onSubmit={saveProfile} className="space-y-3 rounded-lg border p-4">
            <div><h2 className="font-semibold">{staff.full_name}</h2><p className="text-sm text-muted-foreground capitalize">{staff.role} · {staff.department.join(", ")}</p></div>
            <div className="space-y-1"><Label>Phone</Label><Input value={staff.phone ?? ""} readOnly /></div>
            <div className="space-y-1"><Label>Address</Label><Textarea value={profileForm.address} onChange={(event) => setProfileForm({ ...profileForm, address: event.target.value })} /></div>
            <div className="space-y-1"><Label>Emergency contact name</Label><Input value={profileForm.emergency_contact_name} onChange={(event) => setProfileForm({ ...profileForm, emergency_contact_name: event.target.value })} /></div>
            <div className="space-y-1"><Label>Emergency contact phone</Label><Input value={profileForm.emergency_contact_phone} onChange={(event) => setProfileForm({ ...profileForm, emergency_contact_phone: event.target.value })} /></div>
            <Button type="submit" disabled={busy}>Save profile</Button>
            {profile?.updated_at && <p className="text-xs text-muted-foreground">Updated {dateTimeLabel(profile.updated_at)}</p>}
          </form>
          <div className="space-y-4 rounded-lg border p-4">
            <div><h2 className="font-semibold">My documents</h2><p className="text-xs text-muted-foreground">PDFs and images up to 10 MB.</p></div>
            <form onSubmit={uploadOwnDocument} className="space-y-3">
              <div className="space-y-1"><Label>Document type</Label><select name="document-type" className={fieldClass}><option value="identification">Identification</option><option value="contract">Contract</option><option value="certificate">Certificate</option><option value="other">Other</option></select></div>
              <div className="space-y-1"><Label>Choose file</Label><Input name="staff-document" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required /></div>
              <Button type="submit" variant="outline" disabled={busy}><Upload className="mr-2 h-4 w-4" />Upload</Button>
            </form>
            <div className="space-y-2">
              {documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : documents.map((document) => (
                <div key={document.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 p-2">
                  <div className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0" /><span className="truncate text-sm">{document.file_name}</span><Badge variant="outline" className="capitalize">{document.document_type}</Badge></div>
                  <div className="flex gap-1"><Button size="sm" variant="ghost" onClick={() => void openStaffDocument(document.storage_path).catch((error: unknown) => toast.error(`Couldn't open document: ${error instanceof Error ? error.message : "Unknown error"}`))}>Open</Button><Button size="sm" variant="ghost" onClick={() => void deleteOwnDocument(document)}>Delete</Button></div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
