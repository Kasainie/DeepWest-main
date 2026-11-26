export interface CompanyReference {
  id: string;
  name: string;
}

interface OrderFact {
  company_id: string | null;
}

interface AmountFact {
  company_id: string | null;
  amount: number | null;
}

export interface CompanyPerformance extends CompanyReference {
  orderCount: number;
  revenue: number;
  expenses: number;
  profit: number;
  loss: number;
}

export interface CombinedDashboardPerformance {
  companies: CompanyPerformance[];
  totalOrders: number;
  totalRevenue: number;
  totalProfit: number;
  totalLoss: number;
  topRevenueCompanyIds: string[];
}

export function calculateCombinedDashboardPerformance(
  companies: CompanyReference[],
  orders: OrderFact[],
  sales: AmountFact[],
  expenses: AmountFact[],
): CombinedDashboardPerformance {
  const totals = new Map(
    companies.map((company) => [
      company.id,
      { orderCount: 0, revenue: 0, expenses: 0 },
    ]),
  );

  for (const order of orders) {
    const companyTotals = order.company_id ? totals.get(order.company_id) : undefined;
    if (companyTotals) companyTotals.orderCount += 1;
  }

  for (const sale of sales) {
    const companyTotals = sale.company_id ? totals.get(sale.company_id) : undefined;
    if (companyTotals) companyTotals.revenue += Number(sale.amount ?? 0);
  }

  for (const expense of expenses) {
    const companyTotals = expense.company_id ? totals.get(expense.company_id) : undefined;
    if (companyTotals) companyTotals.expenses += Number(expense.amount ?? 0);
  }

  const companyPerformance = companies.map((company): CompanyPerformance => {
    const companyTotals = totals.get(company.id)!;
    const net = companyTotals.revenue - companyTotals.expenses;

    return {
      ...company,
      ...companyTotals,
      profit: Math.max(net, 0),
      loss: Math.max(-net, 0),
    };
  });

  const highestRevenue = Math.max(0, ...companyPerformance.map((company) => company.revenue));

  return {
    companies: companyPerformance,
    totalOrders: companyPerformance.reduce((sum, company) => sum + company.orderCount, 0),
    totalRevenue: companyPerformance.reduce((sum, company) => sum + company.revenue, 0),
    totalProfit: companyPerformance.reduce((sum, company) => sum + company.profit, 0),
    totalLoss: companyPerformance.reduce((sum, company) => sum + company.loss, 0),
    topRevenueCompanyIds: highestRevenue > 0
      ? companyPerformance
          .filter((company) => Math.abs(company.revenue - highestRevenue) < 0.005)
          .map((company) => company.id)
      : [],
  };
}
