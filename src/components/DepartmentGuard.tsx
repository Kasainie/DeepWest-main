import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";

// Maps routes to the departments that can access them
const ROUTE_DEPARTMENTS: Record<string, string[]> = {
  "/restaurant": ["restaurant"],
  "/waiter": ["restaurant"],
  "/kitchen": ["kitchen"],
  "/sales": ["accountant"],
  "/expenses": ["accountant"],
};

// Routes only accessible to owner/admin/manager
const ADMIN_ONLY_ROUTES = ["/staff", "/settings"];

export function DepartmentGuard({ children }: { children: React.ReactNode }) {
  const { companyRole, staffDepartment, staffRole, loading } = useCompany();
  const location = useLocation();
  const path = location.pathname;

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isFullAccess = !companyRole || ["owner", "admin", "manager"].includes(companyRole);
  const isWaiter = staffRole?.toLowerCase() === "waiter";

  if (path.startsWith("/waiter") && !isWaiter) {
    return <Navigate to="/dashboard" replace />;
  }
  if (isWaiter && (path.startsWith("/restaurant") || path === "/dashboard")) {
    return <Navigate to="/waiter" replace />;
  }

  // Full-access roles can go anywhere
  if (isFullAccess) return <>{children}</>;

  // Staff on admin-only routes → redirect
  if (ADMIN_ONLY_ROUTES.some((r) => path.startsWith(r))) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check department-restricted routes
  const allowedDepartments = Object.entries(ROUTE_DEPARTMENTS).find(([route]) =>
    path.startsWith(route)
  )?.[1];

  if (allowedDepartments && (!staffDepartment || !staffDepartment.some(d => allowedDepartments.includes(d.toLowerCase())))) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
