import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, User, Loader2, Plus, Copy, Trash2, KeyRound, Building2, UtensilsCrossed, Wine, ChefHat, Calculator, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { InviteStaffDialog } from "@/components/InviteStaffDialog";
import { PendingInvitations } from "@/components/PendingInvitations";

interface StaffRecord {
  id: string;
  full_name: string;
  staff_code: string;
  department: string;
  role: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

const departments = [
  { value: "hotel", label: "Hotel", icon: Building2 },
  { value: "restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { value: "bar", label: "Bar", icon: Wine },
  { value: "kitchen", label: "Kitchen", icon: ChefHat },
  { value: "accountant", label: "Accountant", icon: Calculator },
];

const roles = [
  { value: "staff", label: "Staff" },
  { value: "manager", label: "Manager" },
  { value: "admin", label: "Admin" },
];

const deptIcons: Record<string, typeof Building2> = {
  hotel: Building2,
  restaurant: UtensilsCrossed,
  bar: Wine,
  kitchen: ChefHat,
  accountant: Calculator,
};

const deptColors: Record<string, string> = {
  hotel: "bg-primary/10 text-primary",
  restaurant: "bg-warning/10 text-warning",
  bar: "bg-accent/10 text-accent",
  kitchen: "bg-destructive/10 text-destructive",
  accountant: "bg-success/10 text-success",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function generateStaffCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "STF-";
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function StaffManagement() {
  const { isAdmin, role: currentUserRole } = useUserRole();
  const { currentCompany, companyRole } = useCompany();
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);
  const [resetting, setResetting] = useState<string | null>(null);
  const canManage = companyRole === "owner" || companyRole === "admin";

  const [form, setForm] = useState({
    full_name: "",
    department: "hotel",
    role: "staff",
    phone: "",
    staff_code: generateStaffCode(),
  });

  useEffect(() => {
    if (currentCompany) fetchStaff();
  }, [currentCompany?.id]);

  const fetchStaff = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("company_staff")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("department", { ascending: true });

    if (!error) setStaffList((data || []) as StaffRecord[]);
    setLoading(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { error } = await supabase.from("company_staff").insert({
      company_id: currentCompany.id,
      full_name: form.full_name.trim(),
      staff_code: form.staff_code.trim().toUpperCase(),
      department: form.department,
      role: form.role,
      phone: form.phone.trim() || null,
    });

    if (error) {
      if (error.code === "23505") toast.error("Staff code already exists in this company");
      else toast.error(error.message);
    } else {
      toast.success("Staff member added!", {
        description: `Code: ${form.staff_code}`,
        duration: 5000,
      });
      setForm({ full_name: "", department: "hotel", role: "staff", phone: "", staff_code: generateStaffCode() });
      setAddOpen(false);
      fetchStaff();
    }
    setSaving(false);
  };

  const handleCopyCode = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Staff code copied!");
  };

  const handleToggleActive = async (staffId: string, isActive: boolean) => {
    const { error } = await supabase
      .from("company_staff")
      .update({ is_active: !isActive })
      .eq("id", staffId);

    if (!error) {
      setStaffList((prev) => prev.map((s) => (s.id === staffId ? { ...s, is_active: !isActive } : s)));
      toast.success(isActive ? "Staff deactivated" : "Staff activated");
    }
  };

  const handleDelete = async (staffId: string) => {
    setDeleting(staffId);
    const { error } = await supabase.from("company_staff").delete().eq("id", staffId);
    if (!error) {
      setStaffList((prev) => prev.filter((s) => s.id !== staffId));
      toast.success("Staff member removed");
    } else {
      toast.error("Failed to remove staff");
    }
    setDeleting(null);
  };

  const handleResetAccess = async (staffId: string, staffName: string) => {
    setResetting(staffId);
    const newCode = generateStaffCode();
    try {
      const { data, error } = await supabase.functions.invoke("reset-staff-access", {
        body: { staff_id: staffId, new_staff_code: newCode },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, staff_code: data.new_staff_code } : s))
      );
      toast.success(`Access code reset for ${staffName}`, {
        description: `New code: ${data.new_staff_code}`,
        duration: 8000,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to reset access");
    }
    setResetting(null);
  };

  if (!isAdmin && currentUserRole !== "manager" && companyRole !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="shadow-card border-0 max-w-md w-full text-center">
          <CardContent className="p-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-bold font-display mb-2">Access Restricted</h2>
            <p className="text-sm text-muted-foreground">
              You need admin or manager permissions to view staff management.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Staff Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage staff members, departments & access codes
          </p>
        </div>
        <div className="flex gap-2">
          {canManage && (
            <>
              <InviteStaffDialog onInviteSent={() => setInviteRefreshKey((k) => k + 1)} />
              <Dialog open={addOpen} onOpenChange={setAddOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Staff
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display">Add Staff Member</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddStaff} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Full Name</Label>
                      <Input
                        value={form.full_name}
                        onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                        placeholder="John Smith"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Department</Label>
                        <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {departments.map((d) => (
                              <SelectItem key={d.value} value={d.value}>
                                <div className="flex items-center gap-2">
                                  <d.icon className="h-3.5 w-3.5" />
                                  {d.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 555-0123"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Staff Code</Label>
                      <div className="flex gap-2">
                        <Input
                          value={form.staff_code}
                          onChange={(e) => setForm((f) => ({ ...f, staff_code: e.target.value.toUpperCase() }))}
                          className="font-mono tracking-widest text-center"
                          required
                        />
                        <Button type="button" variant="outline" size="icon" onClick={() => setForm((f) => ({ ...f, staff_code: generateStaffCode() }))}>
                          <KeyRound className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Staff will use this code to log in
                      </p>
                    </div>
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Staff Member
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </motion.div>

      <motion.div variants={item}>
        <PendingInvitations refreshKey={inviteRefreshKey} />
      </motion.div>

      {/* Department summary cards */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {departments.map((dept) => {
          const count = staffList.filter((s) => s.department === dept.value).length;
          const DeptIcon = dept.icon;
          return (
            <Card key={dept.value} className="shadow-card border-0">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${deptColors[dept.value] || "bg-secondary"}`}>
                  <DeptIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xl font-bold font-display">{count}</p>
                  <p className="text-[11px] text-muted-foreground">{dept.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Staff list */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">All Staff Members</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : staffList.length === 0 ? (
              <div className="text-center py-8">
                <User className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No staff members yet. Add your first staff member above.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {staffList.map((member) => {
                  const DeptIcon = deptIcons[member.department] || User;
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors ${!member.is_active ? "opacity-50" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                          {member.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.full_name}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <Badge className={`${deptColors[member.department] || "bg-muted text-muted-foreground"} text-[10px] border-0`}>
                              <DeptIcon className="h-2.5 w-2.5 mr-0.5" />
                              {member.department}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px] capitalize">
                              {member.role}
                            </Badge>
                            {!member.is_active && (
                              <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-secondary px-2 py-1 rounded hidden sm:inline-block">
                          {member.staff_code}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleCopyCode(member.staff_code)}
                          title="Copy code"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        {canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-primary"
                              onClick={() => handleResetAccess(member.id, member.full_name)}
                              disabled={resetting === member.id}
                              title="Reset access code"
                            >
                              {resetting === member.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                            <Switch
                              checked={member.is_active}
                              onCheckedChange={() => handleToggleActive(member.id, member.is_active)}
                              className="scale-75"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(member.id)}
                              disabled={deleting === member.id}
                            >
                              {deleting === member.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Role Permissions */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Departments & Roles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departments.map((dept) => (
                <div key={dept.value} className="flex gap-3 p-3 rounded-lg bg-secondary/30">
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${deptColors[dept.value]}`}>
                    <dept.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{dept.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {dept.value === "hotel" && "Front desk, housekeeping, reception"}
                      {dept.value === "restaurant" && "Serving, hosting, waitstaff"}
                      {dept.value === "bar" && "Bartenders, lounge staff"}
                      {dept.value === "kitchen" && "Chefs, sous chefs, prep cooks"}
                      {dept.value === "accountant" && "Finance, billing, payroll"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
