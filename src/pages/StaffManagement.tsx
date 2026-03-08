import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, AppRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, ShieldCheck, User, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useCompany } from "@/contexts/CompanyContext";
import { InviteStaffDialog } from "@/components/InviteStaffDialog";
import { PendingInvitations } from "@/components/PendingInvitations";

interface StaffMember {
  user_id: string;
  role: AppRole;
  full_name: string | null;
  email: string;
}

const roleIcons: Record<AppRole, typeof Shield> = {
  admin: ShieldCheck,
  manager: Shield,
  staff: User,
};

const roleBadgeStyles: Record<AppRole, string> = {
  admin: "bg-destructive/10 text-destructive",
  manager: "bg-primary/10 text-primary",
  staff: "bg-muted text-muted-foreground",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function StaffManagement() {
  const { isAdmin, role: currentUserRole } = useUserRole();
  const { companyRole } = useCompany();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteRefreshKey, setInviteRefreshKey] = useState(0);
  const canInvite = companyRole === "owner" || companyRole === "admin";

  const fetchStaff = async () => {
    setLoading(true);

    // Fetch roles
    const { data: roles, error: rolesError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (rolesError) {
      toast.error("Failed to load staff");
      setLoading(false);
      return;
    }

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name");

    const staffList: StaffMember[] = (roles || []).map((r) => {
      const profile = profiles?.find((p) => p.user_id === r.user_id);
      return {
        user_id: r.user_id,
        role: r.role as AppRole,
        full_name: profile?.full_name || null,
        email: profile?.full_name || r.user_id.slice(0, 8),
      };
    });

    setStaff(staffList);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleRoleChange = async (userId: string, newRole: AppRole) => {
    if (!isAdmin) {
      toast.error("Only admins can change roles");
      return;
    }

    setUpdating(userId);
    const { error } = await supabase
      .from("user_roles")
      .update({ role: newRole })
      .eq("user_id", userId);

    if (error) {
      toast.error(error.message || "Failed to update role");
    } else {
      toast.success("Role updated successfully");
      setStaff((prev) =>
        prev.map((s) => (s.user_id === userId ? { ...s, role: newRole } : s))
      );
    }
    setUpdating(null);
  };

  if (!isAdmin && currentUserRole !== "manager") {
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
            Manage staff roles and permissions
          </p>
        </div>
        {canInvite && (
          <InviteStaffDialog onInviteSent={() => setInviteRefreshKey((k) => k + 1)} />
        )}
      </motion.div>

      <motion.div variants={item}>
        <PendingInvitations refreshKey={inviteRefreshKey} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {(["admin", "manager", "staff"] as AppRole[]).map((r) => {
          const count = staff.filter((s) => s.role === r).length;
          const Icon = roleIcons[r];
          return (
            <Card key={r} className="shadow-card border-0">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold font-display">{count}</p>
                  <p className="text-sm text-muted-foreground capitalize">{r}s</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

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
            ) : (
              <div className="space-y-1">
                {staff.map((member) => {
                  const Icon = roleIcons[member.role];
                  return (
                    <div
                      key={member.user_id}
                      className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                          {(member.full_name || "?")
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {member.full_name || "Unknown"}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge
                              className={`${roleBadgeStyles[member.role]} text-[10px] border-0 capitalize`}
                            >
                              <Icon className="h-2.5 w-2.5 mr-0.5" />
                              {member.role}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdmin ? (
                          <Select
                            value={member.role}
                            onValueChange={(val) =>
                              handleRoleChange(member.user_id, val as AppRole)
                            }
                            disabled={updating === member.user_id}
                          >
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="staff">Staff</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-xs text-muted-foreground capitalize">
                            {member.role}
                          </span>
                        )}
                        {updating === member.user_id && (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        )}
                      </div>
                    </div>
                  );
                })}
                {staff.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No staff members found
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Role Permissions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  role: "Admin",
                  icon: ShieldCheck,
                  perms: ["Full system access", "Manage staff roles", "View all bookings & data", "Edit settings & website"],
                },
                {
                  role: "Manager",
                  icon: Shield,
                  perms: ["View all bookings & guests", "Manage rooms & tables", "View reports", "Cannot manage staff roles"],
                },
                {
                  role: "Staff",
                  icon: User,
                  perms: ["View dashboard", "View assigned bookings", "Basic room operations", "Cannot access settings"],
                },
              ].map(({ role, icon: RoleIcon, perms }) => (
                <div key={role} className="flex gap-4 p-3 rounded-lg bg-secondary/30">
                  <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <RoleIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{role}</p>
                    <ul className="mt-1 space-y-0.5">
                      {perms.map((p) => (
                        <li key={p} className="text-xs text-muted-foreground">
                          • {p}
                        </li>
                      ))}
                    </ul>
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
