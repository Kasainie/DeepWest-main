import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { format } from "date-fns";
import { BarChart3, Building2, Loader2, Receipt, ShoppingCart, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { getLocalDateString, getLocalDayBoundsUTC } from "@/lib/dateUtils";
import {
  calculateCombinedDashboardPerformance,
  CombinedDashboardPerformance,
} from "@/lib/combinedDashboard";
import { DateRange, DateRangeFilter } from "@/components/DateRangeFilter";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KshIcon } from "@/components/KshIcon";

const formatCurrency = (amount: number) => `KSh ${amount.toLocaleString()}`;

export default function CombinedDashboard() {
  const { companies, companyRole, loading: companiesLoading } = useCompany();
  const hasAccess = ["owner", "admin", "manager"].includes(companyRole?.toLowerCase() ?? "");
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });
  const [performance, setPerformance] = useState<CombinedDashboardPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAccess || companiesLoading) return;

    if (companies.length < 2) {
      setPerformance(null);
      setLoadError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setPerformance(null);

    const companyIds = companies.map((company) => company.id);
    const { start, end } = getLocalDayBoundsUTC(dateRange.from);
    const rangeStart = getLocalDateString(dateRange.from);
    const rangeEnd = getLocalDateString(dateRange.to);

    const loadPerformance = async () => {
      const [ordersResult, salesResult, expensesResult] = await Promise.all([
        supabase
          .from("orders")
          .select("company_id")
          .in("company_id", companyIds)
          .gte("created_at", start)
          .lte("created_at", getLocalDayBoundsUTC(dateRange.to).end),
        supabase
          .from("sales")
          .select("company_id, amount")
          .in("company_id", companyIds)
          .gte("sale_date", rangeStart)
          .lte("sale_date", rangeEnd),
        supabase
          .from("expenses")
          .select("company_id, amount")
          .in("company_id", companyIds)
          .gte("expense_date", rangeStart)
          .lte("expense_date", rangeEnd),
      ]);

      const queryError = ordersResult.error || salesResult.error || expensesResult.error;
      if (queryError) throw new Error(queryError.message);

      if (!cancelled) {
        setPerformance(
          calculateCombinedDashboardPerformance(
            companies,
            ordersResult.data ?? [],
            salesResult.data ?? [],
            expensesResult.data ?? [],
          ),
        );
      }
    };

    loadPerformance()
      .catch((error: unknown) => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Please try again.";
        setLoadError(message);
        toast.error("Could not load the combined dashboard", { description: message });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [companies, companiesLoading, dateRange, hasAccess]);

  if (!hasAccess) return <Navigate to="/dashboard" replace />;

  const topCompanies = performance?.companies.filter((company) =>
    performance.topRevenueCompanyIds.includes(company.id),
  ) ?? [];
  const highestRevenue = topCompanies[0]?.revenue ?? 0;
  const orderedCompanies = [...(performance?.companies ?? [])].sort(
    (a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name, undefined, { numeric: true }),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Combined Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare orders and financial performance across your hotels.
          </p>
        </div>
        {companies.length >= 2 && (
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
        )}
      </div>

      {companies.length < 2 ? (
        <Card className="border-0 shadow-card">
          <CardContent className="flex items-start gap-3 p-5">
            <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div>
              <p className="font-medium">Access to both hotels is required</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ask an owner or admin to add your account to DeepWest Hotel 1 and DeepWest Hotel 2.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : loadError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Combined dashboard data could not be loaded: {loadError}
        </div>
      ) : performance ? (
        <>
          <div className="rounded-xl border border-primary/20 bg-primary/5 px-5 py-4">
            <div className="flex items-start gap-3">
              <BarChart3 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                {topCompanies.length === 0 ? (
                  <p className="text-sm font-semibold">No sales recorded in this period.</p>
                ) : (
                  <p className="text-sm font-semibold">
                    {topCompanies.length === 1
                      ? `${topCompanies[0].name} produced the most revenue`
                      : `Revenue is tied between ${topCompanies.map((company) => company.name).join(" and ")}`}
                  </p>
                )}
                {topCompanies.length > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Highest revenue: {formatCurrency(highestRevenue)} for the selected period.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatCard
              title="Total Orders"
              value={performance.totalOrders.toLocaleString()}
              change={`Across ${performance.companies.length} hotels`}
              icon={ShoppingCart}
            />
            <StatCard
              title="Total Revenue"
              value={formatCurrency(performance.totalRevenue)}
              change="Recorded sales"
              changeType="positive"
              iconNode={<KshIcon className="h-5 w-5 text-primary" />}
            />
            <StatCard
              title="Profit Across Hotels"
              value={formatCurrency(performance.totalProfit)}
              change="Sum of profitable hotel results"
              changeType="positive"
              icon={TrendingUp}
            />
            <StatCard
              title="Loss Across Hotels"
              value={formatCurrency(performance.totalLoss)}
              change="Sum of hotels operating at a loss"
              changeType="negative"
              icon={TrendingDown}
            />
          </div>

          <div>
            <div className="mb-3">
              <h2 className="text-lg font-semibold font-display">Hotel Comparison</h2>
              <p className="text-sm text-muted-foreground">
                {format(dateRange.from, "MMM d, yyyy")} – {format(dateRange.to, "MMM d, yyyy")}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {orderedCompanies.map((company) => {
                const isTopRevenue = performance.topRevenueCompanyIds.includes(company.id);
                const isProfit = company.profit > 0;
                const netResult = isProfit ? company.profit : company.loss;
                const resultLabel = isProfit ? "Profit" : company.loss > 0 ? "Loss" : "Break-even";

                return (
                  <Card key={company.id} className="border-0 shadow-card">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2">
                        <CardTitle className="text-base font-display">{company.name}</CardTitle>
                        {isTopRevenue && <Badge>Top Revenue</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground">Orders</p>
                          <p className="text-lg font-semibold">{company.orderCount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Revenue</p>
                          <p className="text-lg font-semibold">{formatCurrency(company.revenue)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Expenses</p>
                          <p className="text-lg font-semibold">{formatCurrency(company.expenses)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">{resultLabel}</p>
                          <p className={`text-lg font-semibold ${company.loss > 0 ? "text-destructive" : "text-success"}`}>
                            {formatCurrency(netResult)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Revenue is based on recorded sales. Each hotel’s profit or loss is revenue minus expenses for the selected period.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
