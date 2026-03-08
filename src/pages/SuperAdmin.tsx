import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ShieldCheck, Eye, EyeOff, Pause, Play, Mail, UserCheck, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  is_paused: boolean;
}

interface Staff {
  id: string;
  company_id: string;
  full_name: string;
  department: string[];
  role: string;
  staff_code: string;
  phone: string | null;
  is_active: boolean;
  user_id: string | null;
}

interface Member {
  id: string;
  company_id: string;
  user_id: string;
  role: string;
}

interface PendingUser {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export default function SuperAdmin() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [ownerEmails, setOwnerEmails] = useState<Record<string, string>>({});
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());
  const [togglingPause, setTogglingPause] = useState<Set<string>>(new Set());
  const [approvingUsers, setApprovingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    const { data, error: fnError } = await supabase.functions.invoke("super-admin-companies");
    if (fnError) {
      setError(fnError.message || "Access denied");
    } else if (data?.error) {
      setError(data.error);
    } else {
      setCompanies(data.companies || []);
      setStaff(data.staff || []);
      setMembers(data.members || []);
      setOwnerEmails(data.ownerEmails || {});
      setPendingUsers(data.pendingUsers || []);
    }
    setLoading(false);
  };

  const togglePause = async (companyId: string, isPaused: boolean) => {
    setTogglingPause((prev) => new Set(prev).add(companyId));
    const { data, error } = await supabase.functions.invoke("super-admin-companies?action=toggle_pause", {
      body: { company_id: companyId, is_paused: isPaused },
    });
    if (error || data?.error) {
      toast.error("Failed to update company status");
    } else {
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, is_paused: isPaused } : c))
      );
      toast.success(isPaused ? "Company paused" : "Company resumed");
    }
    setTogglingPause((prev) => {
      const next = new Set(prev);
      next.delete(companyId);
      return next;
    });
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    setApprovingUsers((prev) => new Set(prev).add(userId));
    const { data, error } = await supabase.functions.invoke("super-admin-companies?action=approve_user", {
      body: { user_id: userId, approved },
    });
    if (error || data?.error) {
      toast.error("Failed to update user approval");
    } else {
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast.success(approved ? "User approved" : "User rejected");
    }
    setApprovingUsers((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  const toggleCode = (staffId: string) => {
    setRevealedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(staffId)) next.delete(staffId);
      else next.add(staffId);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading super admin data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  const pausedCount = companies.filter((c) => c.is_paused).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Super Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overview of all registered companies and their staff
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Members</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Paused</CardTitle>
            <Pause className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pausedCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{pendingUsers.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending approvals */}
      {pendingUsers.length > 0 && (
        <Card className="border-amber-500/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              Pending Approvals ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Signed Up</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map((u) => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                      <TableCell className="font-mono text-xs">{u.email}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          size="sm"
                          variant="default"
                          disabled={approvingUsers.has(u.user_id)}
                          onClick={() => handleApproval(u.user_id, true)}
                          className="gap-1"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={approvingUsers.has(u.user_id)}
                          onClick={() => handleApproval(u.user_id, false)}
                          className="gap-1"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Reject
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies accordion */}
      <Accordion type="multiple" className="space-y-3">
        {companies.map((company) => {
          const companyStaff = staff.filter((s) => s.company_id === company.id);
          const companyMembers = members.filter((m) => m.company_id === company.id);
          const ownerEmail = ownerEmails[company.owner_id];

          return (
            <AccordionItem
              key={company.id}
              value={company.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="h-8 w-8 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{company.name}</p>
                      {company.is_paused && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Paused</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {company.email || "No email"} · {companyStaff.length} staff · {companyMembers.length} members
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* Pause toggle */}
                <div className="flex items-center justify-between rounded-md border p-3 bg-muted/50">
                  <div className="flex items-center gap-2">
                    {company.is_paused ? <Pause className="h-4 w-4 text-destructive" /> : <Play className="h-4 w-4 text-green-600" />}
                    <span className="text-sm font-medium">{company.is_paused ? "Company is paused" : "Company is active"}</span>
                  </div>
                  <Switch
                    checked={company.is_paused}
                    disabled={togglingPause.has(company.id)}
                    onCheckedChange={(checked) => togglePause(company.id, checked)}
                  />
                </div>

                {/* Admin login details */}
                <div className="rounded-md border p-3 bg-muted/50">
                  <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                    <Mail className="h-4 w-4" /> Admin / Owner Login
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Owner Email</span>
                      <p className="font-medium font-mono text-xs">{ownerEmail || "—"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Owner ID</span>
                      <p className="font-medium font-mono text-xs">{company.owner_id.slice(0, 12)}…</p>
                    </div>
                  </div>
                </div>

                {/* Company info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div><span className="text-muted-foreground">Phone</span><p className="font-medium">{company.phone || "—"}</p></div>
                  <div><span className="text-muted-foreground">Address</span><p className="font-medium">{company.address || "—"}</p></div>
                  <div><span className="text-muted-foreground">Slug</span><p className="font-medium">{company.slug}</p></div>
                  <div><span className="text-muted-foreground">Created</span><p className="font-medium">{new Date(company.created_at).toLocaleDateString()}</p></div>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Members ({companyMembers.length})</h4>
                  {companyMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {companyMembers.map((m) => (
                        <Badge key={m.id} variant="secondary" className="capitalize">
                          {m.role}<span className="ml-1 text-[10px] opacity-60">{m.user_id.slice(0, 8)}</span>
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No members</p>
                  )}
                </div>

                {/* Staff table */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Staff ({companyStaff.length})</h4>
                  {companyStaff.length > 0 ? (
                    <div className="rounded-md border overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Department</TableHead>
                            <TableHead>Staff Code</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {companyStaff.map((s) => (
                            <TableRow key={s.id}>
                              <TableCell className="font-medium">{s.full_name}</TableCell>
                              <TableCell><Badge variant="outline" className="capitalize">{s.role}</Badge></TableCell>
                              <TableCell>{s.department?.join(", ") || "—"}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {revealedCodes.has(s.id) ? s.staff_code : "••••••"}
                                  </code>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => toggleCode(s.id)}>
                                    {revealedCodes.has(s.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>{s.phone || "—"}</TableCell>
                              <TableCell>
                                <Badge variant={s.is_active ? "default" : "destructive"}>
                                  {s.is_active ? "Active" : "Inactive"}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No staff records</p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
