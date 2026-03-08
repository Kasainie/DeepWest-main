import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Rooms from "./pages/Rooms";
import Restaurant from "./pages/Restaurant";
import Bar from "./pages/Bar";
import Conference from "./pages/Conference";
import Bookings from "./pages/Bookings";
import Guests from "./pages/Guests";
import Website from "./pages/Website";
import SettingsPage from "./pages/SettingsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <DashboardLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/restaurant" element={<Restaurant />} />
            <Route path="/bar" element={<Bar />} />
            <Route path="/conference" element={<Conference />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/website" element={<Website />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </DashboardLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
