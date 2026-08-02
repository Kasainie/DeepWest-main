import { useCompany } from "@/contexts/CompanyContext";
import { Navigate } from "react-router-dom";
import { Loader2, PauseCircle } from "lucide-react";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

export function CompanyGuard({ children }: { children: React.ReactNode }) {
  const { currentCompany, loading } = useCompany();
  const { isSuperAdmin, loading: checking } = useSuperAdmin();

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentCompany) {
    return <Navigate to="/register-company" replace />;
  }

  if ((currentCompany as any).is_paused && !isSuperAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6 text-center">
        <PauseCircle className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Company Paused</h1>
        <p className="text-muted-foreground max-w-md">
          Your company account has been temporarily paused by the system administrator. Please contact support for more information.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
