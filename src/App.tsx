import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useTenantManifest } from "@/hooks/useTenantManifest";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyGuard } from "@/components/CompanyGuard";
import { DepartmentGuard } from "@/components/DepartmentGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
import { SuperAdminGuard } from "@/components/SuperAdminGuard";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Restaurant from "./pages/Restaurant";
import Bar from "./pages/Bar";
import BarAdmin from "./pages/BarAdmin";
import Kitchen from "./pages/Kitchen";
import Conference from "./pages/Conference";
import Bookings from "./pages/Bookings";
import Guests from "./pages/Guests";
import Website from "./pages/Website";
import SettingsPage from "./pages/SettingsPage";
import StaffManagement from "./pages/StaffManagement";
import About from "./pages/About";
import Sales from "./pages/Sales";
import Tenders from "./pages/Tenders";
import Expenses from "./pages/Expenses";
import RegisterCompany from "./pages/RegisterCompany";
import SuperAdmin from "./pages/SuperAdmin";
import PendingApproval from "./pages/PendingApproval";
import RegisterSuccess from "./pages/RegisterSuccess";
import AcceptInvite from "./pages/AcceptInvite";
import Login from "./pages/Login";
import HomeRoute from "./components/HomeRoute";
import ForgotPassword from "./pages/ForgotPassword";
import Install from "./pages/Install";
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
  useTenantManifest();
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/login/:slug" element={<Login />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/install" element={<Install />} />

      {/* Authenticated, no dashboard chrome */}
      <Route path="/register-company" element={<Bare><RegisterCompany /></Bare>} />
      <Route path="/register-success" element={<Bare><RegisterSuccess /></Bare>} />
      <Route path="/accept-invite" element={<Bare><AcceptInvite /></Bare>} />

      {/* Dashboard pages */}
      <Route path="/dashboard" element={<Shell><Dashboard /></Shell>} />
      <Route path="/rooms" element={<Shell><Rooms /></Shell>} />
      <Route path="/restaurant" element={<Shell><Restaurant /></Shell>} />
      <Route path="/bar" element={<Shell><Bar /></Shell>} />
      <Route path="/bar-admin" element={<Shell><BarAdmin /></Shell>} />
      <Route path="/kitchen" element={<Shell><Kitchen /></Shell>} />
      <Route path="/conference" element={<Shell><Conference /></Shell>} />
      <Route path="/bookings" element={<Shell><Bookings /></Shell>} />
      <Route path="/guests" element={<Shell><Guests /></Shell>} />
      <Route path="/sales" element={<Shell><Sales /></Shell>} />
      <Route path="/tenders" element={<Shell><Tenders /></Shell>} />
      <Route path="/expenses" element={<Shell><Expenses /></Shell>} />
      <Route path="/staff" element={<Shell><StaffManagement /></Shell>} />
      <Route path="/website" element={<Shell><Website /></Shell>} />
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

      {/* Per-tenant landing — branded login that doubles as the PWA start_url */}
      <Route path="/:slug" element={<Login />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => {
  usePushNotifications();
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
