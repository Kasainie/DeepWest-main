import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, XCircle, Building2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function AcceptInvite() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "found" | "accepting" | "success" | "error">("loading");
  const [invitation, setInvitation] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token || !user) return;
    loadInvitation();
  }, [token, user]);

  const loadInvitation = async () => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Invalid invitation link");
      return;
    }

    const { data: inv, error } = await supabase
      .from("company_invitations")
      .select("*")
      .eq("token", token)
      .eq("status", "pending")
      .single();

    if (error || !inv) {
      setStatus("error");
      setErrorMessage("Invitation not found or already used");
      return;
    }

    if (new Date(inv.expires_at) < new Date()) {
      setStatus("error");
      setErrorMessage("This invitation has expired");
      return;
    }

    // Check email matches
    if (user!.email?.toLowerCase() !== inv.email.toLowerCase()) {
      setStatus("error");
      setErrorMessage(`This invitation was sent to ${inv.email}. Please log in with that email.`);
      return;
    }

    // Get company info
    const { data: comp } = await supabase
      .from("companies")
      .select("*")
      .eq("id", inv.company_id)
      .single();

    setInvitation(inv);
    setCompany(comp);
    setStatus("found");
  };

  const handleAccept = async () => {
    if (!invitation || !user) return;
    setStatus("accepting");

    try {
      // Add as company member
      const { error: memberError } = await supabase
        .from("company_members")
        .insert({
          company_id: invitation.company_id,
          user_id: user.id,
          role: invitation.role,
        });

      if (memberError) {
        if (memberError.code === "23505") {
          toast.info("You're already a member of this company");
        } else {
          throw memberError;
        }
      }

      // Mark invitation as accepted
      await supabase
        .from("company_invitations")
        .update({ status: "accepted" })
        .eq("id", invitation.id);

      // Set as current company
      await supabase
        .from("profiles")
        .update({ current_company_id: invitation.company_id })
        .eq("user_id", user.id);

      setStatus("success");
      toast.success(`Welcome to ${company?.name || "the team"}!`);

      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      setStatus("error");
      setErrorMessage(err.message || "Failed to accept invitation");
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="shadow-elevated border-0 max-w-md w-full text-center">
          <CardContent className="p-8">
            <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold font-display mb-2">Invalid Link</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This invitation link is invalid.
            </p>
            <Button onClick={() => navigate("/login")}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-elevated border-0">
          <CardContent className="p-8 text-center">
            {status === "loading" && (
              <>
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Loading invitation...</p>
              </>
            )}

            {status === "found" && company && (
              <>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
                  {company.logo_url ? (
                    <img src={company.logo_url} alt={company.name} className="h-12 w-12 rounded-xl object-cover" />
                  ) : (
                    <Building2 className="h-8 w-8 text-primary" />
                  )}
                </div>
                <h2 className="text-xl font-bold font-display mb-1">You've been invited!</h2>
                <p className="text-sm text-muted-foreground mb-1">
                  Join <span className="font-semibold text-foreground">{company.name}</span>
                </p>
                <p className="text-xs text-muted-foreground mb-6">
                  as <span className="capitalize font-medium">{invitation.role}</span>
                </p>
                <Button onClick={handleAccept} className="w-full">
                  Accept Invitation
                </Button>
              </>
            )}

            {status === "accepting" && (
              <>
                <Loader2 className="h-10 w-10 mx-auto animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">Joining company...</p>
              </>
            )}

            {status === "success" && (
              <>
                <CheckCircle className="h-12 w-12 mx-auto text-accent mb-4" />
                <h2 className="text-xl font-bold font-display mb-2">Welcome aboard!</h2>
                <p className="text-sm text-muted-foreground">
                  Redirecting to dashboard...
                </p>
              </>
            )}

            {status === "error" && (
              <>
                <XCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
                <h2 className="text-xl font-bold font-display mb-2">Something went wrong</h2>
                <p className="text-sm text-muted-foreground mb-4">{errorMessage}</p>
                <Button onClick={() => navigate("/login")} variant="outline">
                  Go to Login
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
