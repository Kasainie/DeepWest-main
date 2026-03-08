import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
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

export default function SuperAdmin() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      const { data, error: fnError } = await supabase.functions.invoke(
        "super-admin-companies"
      );
      if (fnError) {
        setError(fnError.message || "Access denied");
      } else if (data?.error) {
        setError(data.error);
      } else {
        setCompanies(data.companies || []);
        setStaff(data.staff || []);
        setMembers(data.members || []);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-display">Super Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overview of all registered companies and their staff
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{staff.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{members.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Companies accordion */}
      <Accordion type="multiple" className="space-y-3">
        {companies.map((company) => {
          const companyStaff = staff.filter((s) => s.company_id === company.id);
          const companyMembers = members.filter((m) => m.company_id === company.id);

          return (
            <AccordionItem
              key={company.id}
              value={company.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  {company.logo_url ? (
                    <img
                      src={company.logo_url}
                      alt={company.name}
                      className="h-8 w-8 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                      <Building2 className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}
                  <div>
                    <p className="font-semibold">{company.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {company.email || "No email"} · {companyStaff.length} staff · {companyMembers.length} members
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                {/* Company info */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Phone</span>
                    <p className="font-medium">{company.phone || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Address</span>
                    <p className="font-medium">{company.address || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Slug</span>
                    <p className="font-medium">{company.slug}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created</span>
                    <p className="font-medium">
                      {new Date(company.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Members */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">Members ({companyMembers.length})</h4>
                  {companyMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {companyMembers.map((m) => (
                        <Badge key={m.id} variant="secondary" className="capitalize">
                          {m.role}
                          <span className="ml-1 text-[10px] opacity-60">
                            {m.user_id.slice(0, 8)}
                          </span>
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
                              <TableCell className="font-medium">
                                {s.full_name}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {s.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {s.department?.join(", ") || "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                                    {revealedCodes.has(s.id)
                                      ? s.staff_code
                                      : "••••••"}
                                  </code>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => toggleCode(s.id)}
                                  >
                                    {revealedCodes.has(s.id) ? (
                                      <EyeOff className="h-3 w-3" />
                                    ) : (
                                      <Eye className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </TableCell>
                              <TableCell>{s.phone || "—"}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={s.is_active ? "default" : "destructive"}
                                >
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
