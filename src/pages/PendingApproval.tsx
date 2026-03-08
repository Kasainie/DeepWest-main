import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export default function PendingApproval() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6 text-center gap-6">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <Clock className="h-10 w-10 text-muted-foreground" />
      </div>
      <div className="space-y-2 max-w-md">
        <h1 className="text-2xl font-bold">Account Pending Approval</h1>
        <p className="text-muted-foreground">
          Your account has been created successfully. A system administrator will review and approve your access shortly. You'll be able to sign in once approved.
        </p>
      </div>
      <Button variant="outline" onClick={signOut} className="gap-2">
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
