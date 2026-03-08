import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Copy, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: string;
  token: string;
  created_at: string;
  expires_at: string;
}

interface PendingInvitationsProps {
  refreshKey?: number;
}

export function PendingInvitations({ refreshKey }: PendingInvitationsProps) {
  const { currentCompany, companyRole } = useCompany();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const canManage = companyRole === "owner" || companyRole === "admin";

  const fetchInvitations = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (!error) {
      setInvitations((data || []) as Invitation[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchInvitations();
  }, [currentCompany?.id, refreshKey]);

  const handleCopyLink = async (token: string) => {
    const link = `${window.location.origin}/accept-invite?token=${token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied to clipboard");
  };

  const handleRevoke = async (id: string) => {
    setDeleting(id);
    const { error } = await supabase
      .from("company_invitations")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Failed to revoke invitation");
    } else {
      toast.success("Invitation revoked");
      setInvitations((prev) => prev.filter((i) => i.id !== id));
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <Card className="shadow-card border-0">
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (invitations.length === 0) return null;

  return (
    <Card className="shadow-card border-0">
      <CardHeader>
        <CardTitle className="text-lg font-display flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          Pending Invitations ({invitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          {invitations.map((inv) => {
            const isExpired = new Date(inv.expires_at) < new Date();
            return (
              <div
                key={inv.id}
                className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge
                      variant="secondary"
                      className="text-[10px] capitalize"
                    >
                      {inv.role}
                    </Badge>
                    {isExpired ? (
                      <span className="text-[10px] text-destructive">Expired</span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">
                        Expires {formatDistanceToNow(new Date(inv.expires_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                </div>
                {canManage && (
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopyLink(inv.token)}
                      title="Copy invite link"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleRevoke(inv.id)}
                      disabled={deleting === inv.id}
                      title="Revoke invitation"
                    >
                      {deleting === inv.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
