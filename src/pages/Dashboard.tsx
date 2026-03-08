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
import { BedDouble, UtensilsCrossed, Users, TrendingUp, CalendarDays, Loader2, Wine, DollarSign, ShoppingCart, Receipt } from "lucide-react";
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

const bookingTypeIcons: Record<string, typeof BedDouble> = {
  room: BedDouble,
  restaurant: UtensilsCrossed,
  conference: CalendarDays,
  bar: TrendingUp,
};

interface RoomStats {
  type: string;
  total: number;
  occupied: number;
}

export default function Dashboard() {
  const { currentCompany } = useCompany();
  const { branding } = useBranding();
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [occupiedRooms, setOccupiedRooms] = useState(0);
  const [totalGuests, setTotalGuests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [periodOrders, setPeriodOrders] = useState(0);
  const [periodOrderRevenue, setPeriodOrderRevenue] = useState(0);
  const [periodSalesTotal, setPeriodSalesTotal] = useState(0);
  const [lowStockItems, setLowStockItems] = useState(0);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [periodExpenses, setPeriodExpenses] = useState(0);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!currentCompany) return;
    fetchDashboardData();
  }, [currentCompany?.id, dateRange]);

  const fetchDashboardData = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const { start: rangeStart } = getLocalDayBoundsUTC(dateRange.from);
    const { end: rangeEnd } = getLocalDayBoundsUTC(dateRange.to);
    const fromDate = getLocalDateString(dateRange.from);
    const toDate = getLocalDateString(dateRange.to);

    const [bookingsRes, roomsRes, guestsRes, ordersRes, salesRes, barRes, pendingOrdersRes, recentOrdersRes, expensesRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, guests(full_name)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("rooms")
        .select("type, status")
        .eq("company_id", currentCompany.id),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", currentCompany.id),
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
        .from("bar_inventory")
        .select("name, stock, low_threshold")
        .eq("company_id", currentCompany.id),
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

    setRecentBookings(bookingsRes.data || []);

    const rooms = roomsRes.data || [];
    setTotalRooms(rooms.length);
    setOccupiedRooms(rooms.filter((r) => r.status === "occupied").length);

    const typeMap = new Map<string, { total: number; occupied: number }>();
    rooms.forEach((r) => {
      const current = typeMap.get(r.type) || { total: 0, occupied: 0 };
      current.total++;
      if (r.status === "occupied") current.occupied++;
      typeMap.set(r.type, current);
    });
    setRoomStats(
      Array.from(typeMap.entries()).map(([type, stats]) => ({
        type,
        ...stats,
      }))
    );

    setTotalGuests(guestsRes.count || 0);

    const orders = ordersRes.data || [];
    setPeriodOrders(orders.length);
    setPeriodOrderRevenue(orders.reduce((sum, o) => sum + Number(o.total), 0));

    const sales = salesRes.data || [];
    setPeriodSalesTotal(sales.reduce((sum, s) => sum + Number(s.amount), 0));

    const barItems = barRes.data || [];
    setLowStockItems(barItems.filter((i) => i.stock <= i.low_threshold).length);

    setPendingOrders(pendingOrdersRes.count || 0);
    setRecentOrders(recentOrdersRes.data || []);

    const expensesData = expensesRes.data || [];
    setPeriodExpenses(expensesData.reduce((sum, e) => sum + Number(e.amount), 0));

    setLoading(false);
  };

  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
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
          <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your property overview.</p>
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
        <StatCard title="Total Rooms" value={String(totalRooms)} change={`${occupiedRooms} occupied`} changeType="neutral" icon={BedDouble} />
        <StatCard title="Occupancy" value={`${occupancyPct}%`} change={`${occupiedRooms}/${totalRooms}`} changeType={occupancyPct > 70 ? "positive" : "neutral"} icon={TrendingUp} />
        <StatCard title="Total Guests" value={String(totalGuests)} change="All time" changeType="neutral" icon={Users} />
        <StatCard title={`${periodLabel}'s Orders`} value={String(periodOrders)} change={pendingOrders > 0 ? `${pendingOrders} pending` : "All clear"} changeType={pendingOrders > 0 ? "negative" : "positive"} icon={ShoppingCart} />
        <StatCard title={`${periodLabel}'s Revenue`} value={`KSh ${periodSalesTotal.toLocaleString()}`} change={`Orders: KSh ${periodOrderRevenue.toLocaleString()}`} changeType="positive" icon={DollarSign} />
        <StatCard title={`${periodLabel}'s Expenses`} value={`KSh ${periodExpenses.toLocaleString()}`} change={periodExpenses > 0 ? `Net: KSh ${(periodSalesTotal - periodExpenses).toLocaleString()}` : "No expenses"} changeType={periodExpenses > 0 ? "negative" : "neutral"} icon={Receipt} />
        <StatCard title="Bar Alerts" value={String(lowStockItems)} change={lowStockItems > 0 ? "Low stock items" : "Stock OK"} changeType={lowStockItems > 0 ? "negative" : "positive"} icon={Wine} />
      </motion.div>

      {/* Revenue Chart */}
      <motion.div variants={item}>
        <RevenueChart />
      </motion.div>

      {/* Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Recent Bookings</CardTitle>
                <Badge variant="secondary" className="text-xs">{recentBookings.length} latest</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings yet</p>
              ) : (
                <div className="space-y-1">
                  {recentBookings.map((booking) => {
                    const Icon = bookingTypeIcons[booking.booking_type] || CalendarDays;
                    return (
                      <div key={booking.id} className="flex items-center justify-between py-2.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{booking.guests?.full_name || "Unknown"}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[120px]">{booking.details || booking.booking_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold">KSh {Number(booking.amount).toLocaleString()}</p>
                          <Badge variant={booking.status === "confirmed" || booking.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

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

        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Room Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roomStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No rooms added yet</p>
              ) : (
                roomStats.map((room) => (
                  <div key={room.type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{room.type}</span>
                      <span className="text-muted-foreground">{room.occupied}/{room.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${room.total > 0 ? (room.occupied / room.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
