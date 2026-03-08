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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Wallet, Loader2, AlertTriangle, CheckCircle2, Download, FileText } from "lucide-react";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatKES } from "@/lib/currency";
import { format } from "date-fns";

interface Tender {
  id: string;
  tender_date: string;
  shift: string;
  payment_method: string;
  expected_amount: number;
  actual_amount: number;
  variance: number;
  notes: string | null;
  created_at: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Tenders() {
  const { currentCompany } = useCompany();
  const [tenders, setTenders] = useState<Tender[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    tender_date: format(new Date(), "yyyy-MM-dd"),
    shift: "day",
    payment_method: "cash",
    expected_amount: "",
    actual_amount: "",
    notes: "",
  });

  useEffect(() => {
    if (currentCompany) fetchTenders();
  }, [currentCompany?.id]);

  const fetchTenders = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("payment_tenders")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("tender_date", { ascending: false })
      .limit(200);
    setTenders((data || []) as Tender[]);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    const { error } = await supabase.from("payment_tenders").insert({
      company_id: currentCompany.id,
      tender_date: form.tender_date,
      shift: form.shift,
      payment_method: form.payment_method,
      expected_amount: parseFloat(form.expected_amount) || 0,
      actual_amount: parseFloat(form.actual_amount) || 0,
      notes: form.notes || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Tender recorded!");
      setForm({ tender_date: format(new Date(), "yyyy-MM-dd"), shift: "day", payment_method: "cash", expected_amount: "", actual_amount: "", notes: "" });
      setAddOpen(false);
      fetchTenders();
    }
    setSaving(false);
  };

  const stats = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const todayTenders = tenders.filter((t) => t.tender_date === today);
    const totalExpected = todayTenders.reduce((a, t) => a + Number(t.expected_amount), 0);
    const totalActual = todayTenders.reduce((a, t) => a + Number(t.actual_amount), 0);
    const totalVariance = totalActual - totalExpected;
    const discrepancies = tenders.filter((t) => Number(t.variance) !== 0).length;
    return { totalExpected, totalActual, totalVariance, discrepancies };
  }, [tenders]);

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
          <h1 className="text-2xl font-bold font-display">Payment Tenders</h1>
          <p className="text-sm text-muted-foreground mt-1">Cash, M-Pesa & card reconciliation by shift</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: "tender_date", header: "Date" },
              { key: "shift", header: "Shift" },
              { key: "payment_method", header: "Method" },
              { key: "expected_amount", header: "Expected (KSh)" },
              { key: "actual_amount", header: "Actual (KSh)" },
              { key: "variance", header: "Variance (KSh)" },
              { key: "notes", header: "Notes" },
            ];
            downloadCSV(tenders.map(t => ({
              ...t,
              expected_amount: Number(t.expected_amount).toFixed(2),
              actual_amount: Number(t.actual_amount).toFixed(2),
              variance: Number(t.variance).toFixed(2),
            })), cols, `tenders-${format(new Date(), "yyyy-MM-dd")}`);
            toast.success("CSV downloaded!");
          }}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: "tender_date", header: "Date" },
              { key: "shift", header: "Shift" },
              { key: "payment_method", header: "Method" },
              { key: "expected_amount", header: "Expected" },
              { key: "actual_amount", header: "Actual" },
              { key: "variance", header: "Variance" },
              { key: "notes", header: "Notes" },
            ];
            downloadPDF("Payment Tenders Report", currentCompany?.name || "Company", cols,
              tenders.map(t => ({
                ...t,
                expected_amount: formatKES(Number(t.expected_amount)),
                actual_amount: formatKES(Number(t.actual_amount)),
                variance: formatKES(Number(t.variance)),
              })),
              [
                { label: "Today Expected", value: formatKES(stats.totalExpected) },
                { label: "Today Actual", value: formatKES(stats.totalActual) },
                { label: "Variance", value: formatKES(stats.totalVariance) },
              ]
            );
          }}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Record Tender</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Record Payment Tender</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.tender_date} onChange={(e) => setForm((f) => ({ ...f, tender_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Shift</Label>
                  <Select value={form.shift} onValueChange={(v) => setForm((f) => ({ ...f, shift: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning</SelectItem>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="evening">Evening</SelectItem>
                      <SelectItem value="night">Night</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expected Amount (KSh)</Label>
                  <Input type="number" min="0" step="0.01" value={form.expected_amount} onChange={(e) => setForm((f) => ({ ...f, expected_amount: e.target.value }))} placeholder="0.00" required />
                </div>
                <div className="space-y-2">
                  <Label>Actual Amount (KSh)</Label>
                  <Input type="number" min="0" step="0.01" value={form.actual_amount} onChange={(e) => setForm((f) => ({ ...f, actual_amount: e.target.value }))} placeholder="0.00" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." rows={2} />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Tender
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Today Expected</p>
            <p className="text-xl font-bold font-display mt-1">{formatKES(stats.totalExpected)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Today Actual</p>
            <p className="text-xl font-bold font-display mt-1">{formatKES(stats.totalActual)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Variance</p>
            <p className={`text-xl font-bold font-display mt-1 ${stats.totalVariance >= 0 ? "text-success" : "text-destructive"}`}>
              {stats.totalVariance >= 0 ? "+" : ""}{formatKES(stats.totalVariance)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground">Discrepancies</p>
            <div className="flex items-center gap-2 mt-1">
              {stats.discrepancies > 0 ? (
                <AlertTriangle className="h-4 w-4 text-warning" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-success" />
              )}
              <p className="text-xl font-bold font-display">{stats.discrepancies}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Table */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader><CardTitle className="text-base font-display">Tender Records</CardTitle></CardHeader>
          <CardContent>
            {tenders.length === 0 ? (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold mb-1">No tenders recorded</h3>
                <p className="text-sm text-muted-foreground">Start recording daily payment tenders</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead className="text-right">Variance</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenders.map((t) => {
                      const v = Number(t.variance);
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="text-sm">{format(new Date(t.tender_date), "MMM d, yyyy")}</TableCell>
                          <TableCell><Badge variant="outline" className="capitalize text-xs">{t.shift}</Badge></TableCell>
                          <TableCell><Badge variant="secondary" className="capitalize text-xs">{t.payment_method.replace("_", " ")}</Badge></TableCell>
                          <TableCell className="text-right text-sm">{formatKES(Number(t.expected_amount))}</TableCell>
                          <TableCell className="text-right text-sm">{formatKES(Number(t.actual_amount))}</TableCell>
                          <TableCell className={`text-right text-sm font-medium ${v > 0 ? "text-success" : v < 0 ? "text-destructive" : ""}`}>
                            {v > 0 ? "+" : ""}{formatKES(v)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[150px] truncate">{t.notes || "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
