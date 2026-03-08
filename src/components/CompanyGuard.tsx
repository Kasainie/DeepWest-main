import { useCompany } from "@/contexts/CompanyContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export function CompanyGuard({ children }: { children: React.ReactNode }) {
  const { currentCompany, loading } = useCompany();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentCompany) {
    return <Navigate to="/register-company" replace />;
  }

  return <>{children}</>;
}
