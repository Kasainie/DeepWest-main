import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CompanyProvider } from "@/contexts/CompanyContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CompanyGuard } from "@/components/CompanyGuard";
import { DepartmentGuard } from "@/components/DepartmentGuard";
import { DashboardLayout } from "@/components/DashboardLayout";
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
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/pending-approval" element={<PendingApproval />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/register-company"
              element={
                <ProtectedRoute>
                  <CompanyProvider>
                    <RegisterCompany />
                  </CompanyProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/register-success"
              element={
                <ProtectedRoute>
                  <CompanyProvider>
                    <RegisterSuccess />
                  </CompanyProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/accept-invite"
              element={
                <ProtectedRoute>
                  <CompanyProvider>
                    <AcceptInvite />
                  </CompanyProvider>
                </ProtectedRoute>
              }
            />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <CompanyProvider>
                    <CompanyGuard>
                      <BrandingProvider>
                        <DashboardLayout>
                          <DepartmentGuard>
                            <Routes>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/rooms" element={<Rooms />} />
                              <Route path="/restaurant" element={<Restaurant />} />
                              <Route path="/bar" element={<Bar />} />
                              <Route path="/bar-admin" element={<BarAdmin />} />
                              <Route path="/kitchen" element={<Kitchen />} />
                              <Route path="/conference" element={<Conference />} />
                              <Route path="/bookings" element={<Bookings />} />
                              <Route path="/guests" element={<Guests />} />
                              <Route path="/sales" element={<Sales />} />
                              <Route path="/tenders" element={<Tenders />} />
                              <Route path="/expenses" element={<Expenses />} />
                              <Route path="/staff" element={<StaffManagement />} />
                              <Route path="/website" element={<Website />} />
                              <Route path="/settings" element={<SettingsPage />} />
                              <Route path="/about" element={<About />} />
                              <Route path="/super-admin" element={<SuperAdmin />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          </DepartmentGuard>
                        </DashboardLayout>
                      </BrandingProvider>
                    </CompanyGuard>
                  </CompanyProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
