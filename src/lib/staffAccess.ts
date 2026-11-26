export const DEPARTMENT_ACCESS_OPTIONS: Record<
  string,
  { permission: string; label: string }[]
> = {
  restaurant: [
    { permission: "restaurant.orders", label: "Create and manage orders" },
    { permission: "restaurant.menu", label: "Manage menu" },
  ],
  kitchen: [
    { permission: "kitchen.orders", label: "View and update kitchen orders" },
    { permission: "kitchen.inventory", label: "View and restock inventory" },
  ],
  accountant: [
    { permission: "accounting.sales", label: "View and manage sales" },
    { permission: "accounting.expenses", label: "View and manage expenses" },
    { permission: "accounting.inventory", label: "View inventory reports" },
  ],
  housekeeping: [
    { permission: "housekeeping.tasks", label: "View and update assigned cleaning tasks" },
    { permission: "housekeeping.manage", label: "Create and assign cleaning tasks" },
  ],
};

const PERMISSION_DEPARTMENT: Record<string, string> = {
  "restaurant.orders": "restaurant",
  "restaurant.menu": "restaurant",
  "kitchen.orders": "kitchen",
  "kitchen.inventory": "kitchen",
  "accounting.sales": "accountant",
  "accounting.expenses": "accountant",
  "accounting.inventory": "accountant",
  "housekeeping.tasks": "housekeeping",
  "housekeeping.manage": "housekeeping",
};

const FULL_ACCESS_ROLES = ["owner", "admin", "manager"];

export function canViewBusinessDashboard(
  companyRole: string | null,
  staffDepartment: string[] | null,
  staffRole: string | null,
): boolean {
  if (companyRole && FULL_ACCESS_ROLES.includes(companyRole.toLowerCase())) return true;
  const role = staffRole?.toLowerCase();
  if (role === "cashier" || role === "accountant") return true;
  return staffDepartment?.some((department) => department.toLowerCase() === "accountant") ?? false;
}

export function getStaffLandingPath(
  staffDepartment: string[] | null,
  staffRole: string | null,
): string {
  if (staffRole?.toLowerCase() === "waiter") return "/waiter";

  const department = staffDepartment?.map((item) => item.toLowerCase()) ?? [];
  if (department.includes("kitchen")) return "/kitchen";
  if (department.includes("restaurant")) return "/restaurant";
  if (department.includes("accountant")) return "/sales";
  if (department.includes("housekeeping")) return "/housekeeping";
  return "/about";
}

export function hasStaffAccess(
  companyRole: string | null,
  staffDepartment: string[] | null,
  staffPermissions: string[] | null,
  permission: string,
): boolean {
  if (!companyRole || FULL_ACCESS_ROLES.includes(companyRole.toLowerCase())) return true;

  const department = PERMISSION_DEPARTMENT[permission];
  if (!department || !staffDepartment?.some((item) => item.toLowerCase() === department)) return false;
  return staffPermissions === null || staffPermissions.includes(permission);
}

export function hasAnyStaffAccess(
  companyRole: string | null,
  staffDepartment: string[] | null,
  staffPermissions: string[] | null,
  permissions: string[],
): boolean {
  return permissions.some((permission) =>
    hasStaffAccess(companyRole, staffDepartment, staffPermissions, permission),
  );
}
