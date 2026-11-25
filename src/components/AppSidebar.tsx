import {
  LayoutDashboard,
  UtensilsCrossed,
  Settings,
  Building2,
  ShieldCheck,
  ChefHat,
  Info,
  Banknote,
  Receipt,
  Crown,
  ClipboardList,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { useLocation } from "react-router-dom";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, departments: null, hideFromWaiters: true },
  { title: "Restaurant", url: "/restaurant", icon: UtensilsCrossed, departments: ["restaurant"], hideFromWaiters: true },
  { title: "Waiter", url: "/waiter", icon: ClipboardList, departments: ["restaurant"], waiterOnly: true },
  { title: "Kitchen", url: "/kitchen", icon: ChefHat, departments: ["kitchen"] },
];

const accountingItems = [
  { title: "Sales", url: "/sales", icon: Banknote, departments: ["accountant"] },
  { title: "Expenses", url: "/expenses", icon: Receipt, departments: ["accountant"] },
];

const managementItems = [
  { title: "Staff", url: "/staff", icon: ShieldCheck, departments: null, adminOnly: true },
  { title: "Settings", url: "/settings", icon: Settings, departments: null, adminOnly: true },
  { title: "About", url: "/about", icon: Info, departments: null, adminOnly: false },
];

export function AppSidebar() {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { currentCompany, companyRole, staffDepartment, staffRole } = useCompany();
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);
  const isWaiter = staffRole?.toLowerCase() === "waiter";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  // Owners/admins see everything; staff only see their department pages
  const isFullAccess = !companyRole || ["owner", "admin", "manager"].includes(companyRole);

  const filterByDepartment = (items: typeof mainItems | typeof managementItems) =>
    items.filter((item) => {
      if ("waiterOnly" in item && item.waiterOnly && !isWaiter) return false;
      if ("hideFromWaiters" in item && item.hideFromWaiters && isWaiter) return false;
      // Admin-only items hidden from staff
      if ("adminOnly" in item && item.adminOnly && !isFullAccess) return false;
      if (isFullAccess || !item.departments) return true;
      if (!staffDepartment || staffDepartment.length === 0) return false;
      return staffDepartment.some(d => item.departments!.includes(d.toLowerCase()));
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          {currentCompany?.logo_url ? (
            <img
              src={currentCompany.logo_url}
              alt={currentCompany.name}
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <img
              src="/deepwest-app-icon.png"
              alt="DeepWest Hotel"
              className="h-9 w-9 shrink-0 rounded-lg object-cover"
            />
          )}
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-sidebar-accent-foreground font-display truncate">
                {currentCompany?.name || "My Company"}
              </h2>
              <p className="text-xs text-sidebar-foreground truncate">
                {currentCompany?.description || "Restaurant"}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByDepartment(mainItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {filterByDepartment(accountingItems).length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Accounting</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {filterByDepartment(accountingItems).map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                        onClick={handleNavClick}
                      >
                        <item.icon className="h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filterByDepartment(managementItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      onClick={handleNavClick}
                    >
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>System</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive("/super-admin")}
                    tooltip="Super Admin"
                  >
                    <NavLink
                      to="/super-admin"
                      end
                      activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                      onClick={handleNavClick}
                    >
                      <Crown className="h-4 w-4" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && (
          <div className="rounded-lg bg-sidebar-accent p-3">
            <p className="text-xs text-sidebar-foreground">
              System Status
            </p>
            <div className="mt-1 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-success" />
              <span className="text-xs text-sidebar-accent-foreground">All systems operational</span>
            </div>
          </div>
        )}
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-center gap-1.5"}`}>
          <Building2 className="h-3 w-3 text-sidebar-foreground opacity-60" />
          {!collapsed && (
            <span className="text-[10px] text-sidebar-foreground opacity-60">
              DeepWest Hotels
            </span>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
