import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPER_ADMIN_EMAIL = "kochjomboz04@gmail.com";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, user, loading } = useAuth();
  const [approvalStatus, setApprovalStatus] = useState<"loading" | "approved" | "pending">("loading");

  useEffect(() => {
    if (!user) {
      setApprovalStatus("loading");
      return;
    }

    // Super admin always approved
    if (user.email === SUPER_ADMIN_EMAIL) {
      setApprovalStatus("approved");
      return;
    }

    const checkApproval = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", user.id)
        .single();

      setApprovalStatus(data?.is_approved ? "approved" : "pending");
    };
    checkApproval();
  }, [user]);

  if (loading || (session && approvalStatus === "loading")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (approvalStatus === "pending") {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
}
