import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/contexts/CompanyContext";
import {
  canViewBusinessDashboard,
  getStaffLandingPath,
  hasAnyStaffAccess,
} from "@/lib/staffAccess";

const ROUTE_PERMISSIONS: Record<string, string[]> = {
  "/restaurant": ["restaurant.orders", "restaurant.menu"],
  "/waiter": ["restaurant.orders"],
  "/kitchen": ["kitchen.orders"],
  "/inventory": ["accounting.inventory", "kitchen.inventory"],
  "/sales": ["accounting.sales"],
  "/expenses": ["accounting.expenses"],
  "/housekeeping": ["housekeeping.tasks", "housekeeping.manage"],
};

// Routes only accessible to owner/admin/manager
const ADMIN_ONLY_ROUTES = ["/settings", "/combined-dashboard"];

export function DepartmentGuard({ children }: { children: React.ReactNode }) {
  const { companyRole, staffDepartment, staffPermissions, staffRole, loading } = useCompany();
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

  if (
    path === "/dashboard" &&
    !canViewBusinessDashboard(companyRole, staffDepartment, staffRole)
  ) {
    return <Navigate to={getStaffLandingPath(staffDepartment, staffRole)} replace />;
  }

  if (path.startsWith("/waiter") && !isWaiter) {
    return <Navigate to={getStaffLandingPath(staffDepartment, staffRole)} replace />;
  }
  if (isWaiter && (path.startsWith("/restaurant") || path === "/dashboard")) {
    return <Navigate to="/waiter" replace />;
  }

  // Full-access roles can go anywhere
  if (isFullAccess) return <>{children}</>;

  // Staff on admin-only routes → redirect
  if (ADMIN_ONLY_ROUTES.some((r) => path.startsWith(r))) {
    return <Navigate to={getStaffLandingPath(staffDepartment, staffRole)} replace />;
  }

  // Check department and page-level permissions for staff routes.
  const requiredPermissions = Object.entries(ROUTE_PERMISSIONS).find(([route]) =>
    path.startsWith(route)
  )?.[1];

  if (
    requiredPermissions &&
    !hasAnyStaffAccess(companyRole, staffDepartment, staffPermissions, requiredPermissions)
  ) {
    return <Navigate to={getStaffLandingPath(staffDepartment, staffRole)} replace />;
  }

  return <>{children}</>;
}
