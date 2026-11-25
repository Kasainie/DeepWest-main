import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { KshIcon } from "@/components/KshIcon";
import { toast } from "sonner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, subWeeks, subMonths, startOfDay, startOfWeek, startOfMonth, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from "date-fns";

type Period = "daily" | "weekly" | "monthly";

interface DataPoint {
  label: string;
  orders: number;
}

export default function RevenueChart() {
  const { currentCompany } = useCompany();
  const [period, setPeriod] = useState<Period>("daily");
  const [orderData, setOrderData] = useState<{ date: string; total: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompany) return;
    fetchRevenue();
  }, [currentCompany?.id]);

  const fetchRevenue = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const since = subMonths(new Date(), 6).toISOString();

    const { data: orders, error } = await supabase
      .from("orders")
      .select("created_at, total")
      .eq("company_id", currentCompany.id)
      .gte("created_at", since)
      .order("created_at", { ascending: true });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    setOrderData(
      (orders || []).map((o) => ({
        date: o.created_at,
        total: Number(o.total) || 0,
      }))
    );
    setLoading(false);
  };

  const chartData = useMemo((): DataPoint[] => {
    const now = new Date();
    let intervals: Date[];
    let keyFn: (d: Date) => string;
    let labelFn: (d: Date) => string;

    if (period === "daily") {
      const start = subDays(now, 13);
      intervals = eachDayOfInterval({ start, end: now });
      keyFn = (d) => format(startOfDay(d), "yyyy-MM-dd");
      labelFn = (d) => format(d, "MMM d");
    } else if (period === "weekly") {
      const start = subWeeks(now, 7);
      intervals = eachWeekOfInterval({ start, end: now }, { weekStartsOn: 1 });
      keyFn = (d) => format(startOfWeek(d, { weekStartsOn: 1 }), "yyyy-MM-dd");
      labelFn = (d) => format(d, "MMM d");
    } else {
      const start = subMonths(now, 5);
      intervals = eachMonthOfInterval({ start, end: now });
      keyFn = (d) => format(startOfMonth(d), "yyyy-MM");
      labelFn = (d) => format(d, "MMM yyyy");
    }

    const buckets = new Map<string, number>();
    intervals.forEach((d) => {
      const key = period === "monthly" ? format(d, "yyyy-MM") : keyFn(d);
      buckets.set(key, 0);
    });

    orderData.forEach((o) => {
      const d = new Date(o.date);
      const key = period === "monthly" ? format(d, "yyyy-MM") : keyFn(d);
      const bucket = buckets.get(key);
      if (bucket !== undefined) buckets.set(key, bucket + o.total);
    });

    return intervals.map((d) => {
      const key = period === "monthly" ? format(d, "yyyy-MM") : keyFn(d);
      return {
        label: labelFn(d),
        orders: Math.round((buckets.get(key) || 0) * 100) / 100,
      };
    });
  }, [orderData, period]);

  const grandTotal = chartData.reduce((s, d) => s + d.orders, 0);

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <KshIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Revenue</CardTitle>
              <p className="text-xs text-muted-foreground">
                KSh {grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} total
              </p>
            </div>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="daily" className="text-xs px-3 h-6">Daily</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs px-3 h-6">Weekly</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-3 h-6">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-[220px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `KSh ${v}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: 12,
                }}
                formatter={(value: number) => [`KSh ${value.toFixed(2)}`, "Orders"]}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                fill="url(#colorOrders)"
                name="orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
            Orders
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
