import { describe, expect, it } from "vitest";
import { calculateCombinedDashboardPerformance } from "@/lib/combinedDashboard";

const companies = [
  { id: "hotel-1", name: "DeepWest Hotel 1" },
  { id: "hotel-2", name: "DeepWest Hotel 2" },
];

describe("calculateCombinedDashboardPerformance", () => {
  it("combines orders, revenue, profit, and loss by hotel", () => {
    const performance = calculateCombinedDashboardPerformance(
      companies,
      [
        { company_id: "hotel-1" },
        { company_id: "hotel-1" },
        { company_id: "hotel-2" },
      ],
      [
        { company_id: "hotel-1", amount: 120 },
        { company_id: "hotel-1", amount: 80 },
        { company_id: "hotel-2", amount: 100 },
      ],
      [
        { company_id: "hotel-1", amount: 50 },
        { company_id: "hotel-2", amount: 120 },
      ],
    );

    expect(performance.totalOrders).toBe(3);
    expect(performance.totalRevenue).toBe(300);
    expect(performance.totalProfit).toBe(150);
    expect(performance.totalLoss).toBe(20);
    expect(performance.topRevenueCompanyIds).toEqual(["hotel-1"]);
  });

  it("marks tied revenue leaders and leaves the leader unset when there are no sales", () => {
    const tied = calculateCombinedDashboardPerformance(
      companies,
      [],
      [
        { company_id: "hotel-1", amount: 100 },
        { company_id: "hotel-2", amount: 100 },
      ],
      [],
    );
    const noSales = calculateCombinedDashboardPerformance(companies, [], [], []);

    expect(tied.topRevenueCompanyIds).toEqual(["hotel-1", "hotel-2"]);
    expect(noSales.topRevenueCompanyIds).toEqual([]);
  });
});
