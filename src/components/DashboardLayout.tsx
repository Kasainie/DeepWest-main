import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Search, LogOut, Building2, Sun, Moon } from "lucide-react";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useBranding } from "@/contexts/BrandingContext";
import { CompanySwitcher } from "@/components/CompanySwitcher";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) { // notification dropdown
  const { user, signOut } = useAuth();
  const { currentCompany, companyRole } = useCompany();
  const displayName = user?.user_metadata?.full_name || user?.email || "Guest";
  const initials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "GV";

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b px-4 bg-card">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              {currentCompany?.logo_url ? (
                <img
                  src={currentCompany.logo_url}
                  alt={currentCompany.name}
                  className="h-8 w-8 rounded-lg object-cover shrink-0 hidden sm:block"
                />
              ) : (
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0 hidden sm:block">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <CompanySwitcher />
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bookings, guests..."
                  className="w-72 pl-9 h-9 bg-secondary border-0"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationDropdown />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                  {initials}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-xs font-medium leading-tight">{displayName}</span>
                  {companyRole && (
                    <Badge variant="secondary" className="text-[9px] capitalize px-1.5 py-0">
                      {companyRole}
                    </Badge>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
