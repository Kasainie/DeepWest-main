import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserPlus, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

const inviteSchema = z.object({
  email: z.string().trim().email("Please enter a valid email"),
  role: z.enum(["staff", "manager", "admin"]),
});

interface InviteStaffDialogProps {
  onInviteSent?: () => void;
}

export function InviteStaffDialog({ onInviteSent }: InviteStaffDialogProps) {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("staff");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !user) return;

    try {
      const parsed = inviteSchema.parse({ email, role });
      setLoading(true);

      const { data, error } = await supabase
        .from("company_invitations")
        .insert({
          company_id: currentCompany.id,
          email: parsed.email,
          role: parsed.role,
          invited_by: user.id,
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          toast.error("This email has already been invited");
        } else {
          throw error;
        }
        return;
      }

      // Generate invite link
      const inviteLink = `${window.location.origin}/accept-invite?token=${data.token}`;

      // Send email via Resend
      const { error: emailError } = await supabase.functions.invoke(
        "send-invitation-email",
        {
          body: {
            invitation_token: data.token,
            origin: window.location.origin,
          },
        },
      );

      // Copy link as fallback
      try {
        await navigator.clipboard.writeText(inviteLink);
      } catch {}

      if (emailError) {
        toast.warning("Invite created, but email failed to send", {
          description: "Link copied to clipboard — share it manually.",
          duration: 7000,
        });
      } else {
        toast.success(`Invitation emailed to ${parsed.email}`, {
          description: "Link also copied to clipboard as a backup.",
          duration: 6000,
        });
      }

      setEmail("");
      setRole("staff");
      setOpen(false);
      onInviteSent?.();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Failed to create invitation");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Invite Staff Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                className="pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Choose the permission level for this member
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4 mr-2" />
            )}
            Send Invitation
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
