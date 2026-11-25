import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyGuard } from "@/components/CompanyGuard";
import { DepartmentGuard } from "@/components/DepartmentGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import Dashboard from "./pages/Dashboard";
import Restaurant from "./pages/Restaurant";
import Kitchen from "./pages/Kitchen";
import SettingsPage from "./pages/SettingsPage";
import StaffManagement from "./pages/StaffManagement";
import About from "./pages/About";
import Sales from "./pages/Sales";
import Expenses from "./pages/Expenses";
import SuperAdmin from "./pages/SuperAdmin";
import AcceptInvite from "./pages/AcceptInvite";
import Login from "./pages/Login";
import HomeRoute from "./components/HomeRoute";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// Wrapper for all dashboard pages: auth + company + branding + layout + department guard
const Shell = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <CompanyProvider>
      <CompanyGuard>
        <BrandingProvider>
          <DashboardLayout>
            <DepartmentGuard>{children}</DepartmentGuard>
          </DashboardLayout>
        </BrandingProvider>
      </CompanyGuard>
    </CompanyProvider>
  </ProtectedRoute>
);

// Wrapper for company-scoped pages without dashboard layout (register/invite/success)
const Bare = ({ children }: { children: ReactNode }) => (
  <ProtectedRoute>
    <CompanyProvider>{children}</CompanyProvider>
  </ProtectedRoute>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:slug" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Authenticated, no dashboard chrome */}
      <Route path="/register-company" element={<Navigate to="/dashboard" replace />} />
      <Route path="/register-success" element={<Navigate to="/dashboard" replace />} />
      <Route path="/accept-invite" element={<Bare><AcceptInvite /></Bare>} />

      {/* Dashboard pages */}
      <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
      <Route path="/restaurant" element={<Shell><Restaurant /></Shell>} />
      <Route path="/waiter" element={<Shell><Restaurant waiterMode /></Shell>} />
      <Route path="/kitchen" element={<Shell><Kitchen /></Shell>} />
      <Route path="/sales" element={<Shell><Sales /></Shell>} />
      <Route path="/expenses" element={<Shell><Expenses /></Shell>} />
      <Route path="/staff" element={<Shell><StaffManagement /></Shell>} />
      <Route path="/settings" element={<Shell><SettingsPage /></Shell>} />
      <Route path="/about" element={<Shell><About /></Shell>} />
      <Route
        path="/super-admin"
        element={
          <Shell>
            <SuperAdminGuard>
              <SuperAdmin />
            </SuperAdminGuard>
          </Shell>
        }
      />

      {/* Retired section URLs must not be interpreted as tenant slugs. */}
      <Route path="/rooms" element={<NotFound />} />
      <Route path="/bar" element={<NotFound />} />
      <Route path="/bar-admin" element={<NotFound />} />
      <Route path="/conference" element={<NotFound />} />
      <Route path="/tenders" element={<NotFound />} />
      <Route path="/bookings" element={<NotFound />} />
      <Route path="/guests" element={<NotFound />} />
      <Route path="/website" element={<NotFound />} />

      {/* Per-tenant landing */}
      <Route path="/:slug" element={<Login />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
