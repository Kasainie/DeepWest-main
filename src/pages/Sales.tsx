import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, TrendingUp, BarChart3, Loader2, ArrowUpRight, ArrowDownRight, Download, FileText } from "lucide-react";
import { KshIcon } from "@/components/KshIcon";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatKES } from "@/lib/currency";
import { format, subDays, startOfMonth } from "date-fns";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

interface Sale {
  id: string;
  sale_date: string;
  department: string;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string;
  created_at: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const DEPARTMENTS = ["restaurant", "bar", "hotel", "kitchen", "other"];
const CATEGORIES = ["food", "beverage", "room", "service", "other"];
const PAYMENT_METHODS = ["cash", "mpesa", "card", "bank_transfer"];

export default function Sales() {
  const { currentCompany } = useCompany();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 29), to: new Date() });
  const [form, setForm] = useState({
    sale_date: format(new Date(), "yyyy-MM-dd"),
    department: "restaurant",
    category: "food",
    description: "",
    amount: "",
    payment_method: "cash",
  });

  useEffect(() => {
    if (currentCompany) fetchSales();
  }, [currentCompany?.id]);

  const fetchSales = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const since = subDays(new Date(), 90).toISOString();
    const { data } = await supabase
      .from("sales")
      .select("*")
      .eq("company_id", currentCompany.id)
      .gte("created_at", since)
      .order("sale_date", { ascending: false });
    setSales((data || []) as Sale[]);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    const { error } = await supabase.from("sales").insert({
      company_id: currentCompany.id,
      sale_date: form.sale_date,
      department: form.department,
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount) || 0,
      payment_method: form.payment_method,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Sale recorded!");
      setForm({ sale_date: format(new Date(), "yyyy-MM-dd"), department: "restaurant", category: "food", description: "", amount: "", payment_method: "cash" });
      setAddOpen(false);
      fetchSales();
    }
    setSaving(false);
  };

  const filtered = useMemo(() => {
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    return sales.filter((s) => s.sale_date >= fromStr && s.sale_date <= toStr);
  }, [sales, dateRange]);

  const stats = useMemo(() => {
    const totalSales = filtered.reduce((a, s) => a + Number(s.amount), 0);
    const byDept: Record<string, number> = {};
    filtered.forEach((s) => { byDept[s.department] = (byDept[s.department] || 0) + Number(s.amount); });
    return { totalSales, byDept, count: filtered.length };
  }, [filtered]);

  const chartData = useMemo(() => {
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    const rangeFiltered = sales.filter((s) => s.sale_date >= fromStr && s.sale_date <= toStr);
    const dayMap = new Map<string, number>();
    rangeFiltered.forEach((s) => {
      dayMap.set(s.sale_date, (dayMap.get(s.sale_date) || 0) + Number(s.amount));
    });
    const days = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ label: format(new Date(date), "MMM d"), amount: Math.round(amount * 100) / 100 }));
    return days.length > 0 ? days : [{ label: format(new Date(), "MMM d"), amount: 0 }];
  }, [sales, dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold font-display">Sales</h1>
          <p className="text-sm text-muted-foreground mt-1">Revenue reports & transaction ledger</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: "sale_date", header: "Date" },
              { key: "department", header: "Department" },
              { key: "category", header: "Category" },
              { key: "description", header: "Description" },
              { key: "payment_method", header: "Payment" },
              { key: "amount", header: "Amount (KSh)" },
            ];
            downloadCSV(sales.map(s => ({ ...s, amount: Number(s.amount).toFixed(2) })), cols, `sales-${format(new Date(), "yyyy-MM-dd")}`);
            toast.success("CSV downloaded!");
          }}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: "sale_date", header: "Date" },
              { key: "department", header: "Department" },
              { key: "category", header: "Category" },
              { key: "description", header: "Description" },
              { key: "payment_method", header: "Payment" },
              { key: "amount", header: "Amount (KSh)" },
            ];
            downloadPDF("Sales Report", currentCompany?.name || "Company", cols,
              sales.map(s => ({ ...s, amount: formatKES(Number(s.amount)) })),
              [
                { label: "Today", value: formatKES(stats.todaySales) },
                { label: "This Month", value: formatKES(stats.monthSales) },
                { label: "Total (90d)", value: formatKES(stats.totalSales) },
              ]
            );
          }}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Record Sale</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Record Sale</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.sale_date} onChange={(e) => setForm((f) => ({ ...f, sale_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Amount (KSh)</Label>
                  <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select value={form.department} onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d} className="capitalize">{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select value={form.payment_method} onValueChange={(v) => setForm((f) => ({ ...f, payment_method: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="mpesa">M-Pesa</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Sale
              </Button>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Today's Sales</p>
                <p className="text-2xl font-bold font-display">{formatKES(stats.todaySales)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <KshIcon className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-2xl font-bold font-display">{formatKES(stats.monthSales)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total (90 days)</p>
                <p className="text-2xl font-bold font-display">{formatKES(stats.totalSales)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-accent-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Trend</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="breakdown">By Department</TabsTrigger>
        </TabsList>

        <TabsContent value="chart">
          <motion.div variants={item}>
            <Card className="shadow-card border-0">
              <CardHeader><CardTitle className="text-base font-display">14-Day Sales Trend</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={(v) => `KSh ${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "0.5rem", fontSize: 12 }}
                      formatter={(value: number) => [formatKES(value), "Sales"]}
                    />
                    <Area type="monotone" dataKey="amount" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#salesGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="ledger">
          <motion.div variants={item}>
            <Card className="shadow-card border-0">
              <CardContent className="pt-6">
                {sales.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No sales recorded yet</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sales.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="text-sm">{format(new Date(s.sale_date), "MMM d, yyyy")}</TableCell>
                            <TableCell><Badge variant="outline" className="capitalize text-xs">{s.department}</Badge></TableCell>
                            <TableCell className="capitalize text-sm">{s.category}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{s.description || "—"}</TableCell>
                            <TableCell><Badge variant="secondary" className="capitalize text-xs">{s.payment_method.replace("_", " ")}</Badge></TableCell>
                            <TableCell className="text-right font-medium">{formatKES(Number(s.amount))}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="breakdown">
          <motion.div variants={item}>
            <Card className="shadow-card border-0">
              <CardContent className="pt-6">
                <div className="space-y-3">
                  {Object.entries(stats.byDept).sort(([, a], [, b]) => b - a).map(([dept, amount]) => (
                    <div key={dept} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <span className="capitalize font-medium">{dept}</span>
                      <span className="font-bold font-display">{formatKES(amount)}</span>
                    </div>
                  ))}
                  {Object.keys(stats.byDept).length === 0 && (
                    <p className="text-center text-muted-foreground py-8">No data yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
