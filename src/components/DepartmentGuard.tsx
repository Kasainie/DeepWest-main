import { Navigate, useLocation } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";

// Maps routes to the departments that can access them
const ROUTE_DEPARTMENTS: Record<string, string[]> = {
  "/rooms": ["hotel"],
  "/restaurant": ["restaurant"],
  "/kitchen": ["kitchen"],
  "/bar-admin": ["bar_admin"],
  "/bar": ["bar", "bar_admin"],
  "/conference": ["hotel"],
  "/bookings": ["hotel", "accountant"],
  "/guests": ["hotel"],
  "/sales": ["accountant"],
  "/tenders": ["accountant"],
  "/expenses": ["accountant"],
};

// Routes only accessible to owner/admin/manager
const ADMIN_ONLY_ROUTES = ["/staff", "/website", "/settings"];

export function DepartmentGuard({ children }: { children: React.ReactNode }) {
  const { companyRole, staffDepartment } = useCompany();
  const location = useLocation();
  const path = location.pathname;

  const isFullAccess = !companyRole || ["owner", "admin", "manager"].includes(companyRole);

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
