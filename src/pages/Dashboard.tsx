import { useState, useEffect } from "react";
import { subDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { getLocalDayBoundsUTC, getLocalDateString } from "@/lib/dateUtils";
import { useCompany } from "@/contexts/CompanyContext";
import { useBranding } from "@/contexts/BrandingContext";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UtensilsCrossed, Loader2, ShoppingCart, Receipt } from "lucide-react";
import { motion } from "framer-motion";
import RevenueChart from "@/components/dashboard/RevenueChart";
import { KshIcon } from "@/components/KshIcon";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const { currentCompany } = useCompany();
  const { branding } = useBranding();
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });
  const [loading, setLoading] = useState(true);
  const [periodOrders, setPeriodOrders] = useState(0);
  const [periodOrderRevenue, setPeriodOrderRevenue] = useState(0);
  const [periodSalesTotal, setPeriodSalesTotal] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [periodExpenses, setPeriodExpenses] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!currentCompany) return;
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentCompany?.id, dateRange]);

  const fetchDashboardData = async () => {
    const { start: rangeStart } = getLocalDayBoundsUTC(dateRange.from);
    const { end: rangeEnd } = getLocalDayBoundsUTC(dateRange.to);
    const fromDate = getLocalDateString(dateRange.from);
    const toDate = getLocalDateString(dateRange.to);

    const [ordersRes, salesRes, pendingOrdersRes, recentOrdersRes, expensesRes] = await Promise.all([
      supabase
        .from("orders")
        .select("total, created_at")
        .eq("company_id", currentCompany.id)
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd),
      supabase
        .from("sales")
        .select("amount")
        .eq("company_id", currentCompany.id)
        .gte("sale_date", fromDate)
        .lte("sale_date", toDate),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", currentCompany.id)
        .in("status", ["pending", "preparing"]),
      supabase
        .from("orders")
        .select("id, order_number, table_number, total, status, payment_status, created_at")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("expenses")
        .select("amount")
        .eq("company_id", currentCompany.id)
        .gte("expense_date", fromDate)
        .lte("expense_date", toDate),
    ]);

    const orders = ordersRes.data || [];
    setPeriodOrders(orders.length);
    setPeriodOrderRevenue(orders.reduce((sum, o) => sum + Number(o.total), 0));

    const sales = salesRes.data || [];
    setPeriodSalesTotal(sales.reduce((sum, s) => sum + Number(s.amount), 0));

    setPendingOrders(pendingOrdersRes.count || 0);
    setRecentOrders(recentOrdersRes.data || []);

    const expensesData = expensesRes.data || [];
    setPeriodExpenses(expensesData.reduce((sum, e) => sum + Number(e.amount), 0));

    setLoading(false);
  };

  const isToday = format(dateRange.from, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd") &&
                  format(dateRange.to, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
  const periodLabel = isToday ? "Today" : "Period";

  const showLoading = loading;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {branding?.welcome_message && (
        <motion.div
          variants={item}
          className="rounded-xl bg-primary/10 border border-primary/20 px-5 py-4"
        >
          <p className="text-sm font-medium text-primary font-display">
            {branding.welcome_message}
          </p>
        </motion.div>
      )}

      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your business overview.</p>
        </div>
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </motion.div>

      {showLoading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
      {/* Top-level stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <StatCard title={`${periodLabel}'s Orders`} value={String(periodOrders)} change={pendingOrders > 0 ? `${pendingOrders} pending` : "All clear"} changeType={pendingOrders > 0 ? "negative" : "positive"} icon={ShoppingCart} />
        <StatCard title={`${periodLabel}'s Revenue`} value={`KSh ${periodSalesTotal.toLocaleString()}`} change={`Orders: KSh ${periodOrderRevenue.toLocaleString()}`} changeType="positive" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
        <StatCard title={`${periodLabel}'s Expenses`} value={`KSh ${periodExpenses.toLocaleString()}`} change={periodExpenses > 0 ? `Net: KSh ${(periodSalesTotal - periodExpenses).toLocaleString()}` : "No expenses"} changeType={periodExpenses > 0 ? "negative" : "neutral"} icon={Receipt} />
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={item}>
        <RevenueChart />
      </motion.div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 gap-6">
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Recent Orders</CardTitle>
                <Badge variant="secondary" className="text-xs">{recentOrders.length} latest</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {recentOrders.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No orders yet</p>
              ) : (
                <div className="space-y-1">
                  {recentOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                          <UtensilsCrossed className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Order #{order.order_number}</p>
                          <p className="text-xs text-muted-foreground">{order.table_number ? `Table ${order.table_number}` : "Takeaway"}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold">KSh {Number(order.total).toLocaleString()}</p>
                        <div className="flex gap-1">
                          <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {order.status}
                          </Badge>
                          <Badge variant={order.payment_status === "paid" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                            {order.payment_status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
        </>
      )}
    </motion.div>
  );
}
