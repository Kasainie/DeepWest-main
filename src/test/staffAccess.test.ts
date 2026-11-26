import { describe, expect, it } from "vitest";
import {
  canViewBusinessDashboard,
  getStaffLandingPath,
  hasStaffAccess,
} from "@/lib/staffAccess";

describe("hasStaffAccess", () => {
  it("allows all pages for company-level managers", () => {
    expect(hasStaffAccess("manager", null, [], "housekeeping.manage")).toBe(true);
  });

  describe("business dashboard access", () => {
    it.each(["owner", "admin", "manager"])("allows company role %s", (role) => {
      expect(canViewBusinessDashboard(role, null, null)).toBe(true);
    });

    it("allows accountants by department and cashiers by staff role", () => {
      expect(canViewBusinessDashboard("staff", ["accountant"], "accountant")).toBe(true);
      expect(canViewBusinessDashboard("staff", ["restaurant"], "cashier")).toBe(true);
      expect(canViewBusinessDashboard("staff", ["restaurant"], "accountant")).toBe(true);
    });

    it("does not allow kitchen staff and routes them to the kitchen", () => {
      expect(canViewBusinessDashboard("staff", ["kitchen"], "chef")).toBe(false);
      expect(getStaffLandingPath(["kitchen"], "chef")).toBe("/kitchen");
    });
  });

  it("limits staff to the selected department pages", () => {
    expect(
      hasStaffAccess("staff", ["restaurant"], ["restaurant.orders"], "restaurant.orders"),
    ).toBe(true);
    expect(
      hasStaffAccess("staff", ["restaurant"], ["restaurant.orders"], "restaurant.menu"),
    ).toBe(false);
  });

  it("preserves department-wide access for legacy staff without explicit permissions", () => {
    expect(hasStaffAccess("staff", ["kitchen"], null, "kitchen.orders")).toBe(true);
    expect(hasStaffAccess("staff", ["kitchen"], null, "accounting.sales")).toBe(false);
  });

  it("does not grant elevated permissions based on a staff title", () => {
    expect(
      hasStaffAccess("staff", ["housekeeping"], ["housekeeping.tasks"], "housekeeping.manage"),
    ).toBe(false);
  });
});
