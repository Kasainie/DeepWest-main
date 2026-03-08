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
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, TrendingDown, PieChart, Loader2, FolderPlus, Download, FileText } from "lucide-react";
import { downloadCSV, downloadPDF } from "@/lib/export";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { formatKES } from "@/lib/currency";
import { format, subDays, startOfMonth } from "date-fns";

interface ExpenseCategory {
  id: string;
  name: string;
  budget_monthly: number;
}

interface Expense {
  id: string;
  category_id: string | null;
  expense_date: string;
  description: string;
  amount: number;
  payment_method: string;
  notes: string | null;
  created_at: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Expenses() {
  const { currentCompany } = useCompany();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [addExpOpen, setAddExpOpen] = useState(false);
  const [addCatOpen, setAddCatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 29), to: new Date() });
  const [expForm, setExpForm] = useState({
    category_id: "",
    expense_date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: "",
    payment_method: "cash",
    notes: "",
  });
  const [catForm, setCatForm] = useState({ name: "", budget_monthly: "" });

  useEffect(() => {
    if (currentCompany) fetchAll();
  }, [currentCompany?.id]);

  const fetchAll = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const [catRes, expRes] = await Promise.all([
      supabase.from("expense_categories").select("*").eq("company_id", currentCompany.id).order("name"),
      supabase.from("expenses").select("*").eq("company_id", currentCompany.id).order("expense_date", { ascending: false }).limit(500),
    ]);
    setCategories((catRes.data || []) as ExpenseCategory[]);
    setExpenses((expRes.data || []) as Expense[]);
    setLoading(false);
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    const { error } = await supabase.from("expense_categories").insert({
      company_id: currentCompany.id,
      name: catForm.name,
      budget_monthly: parseFloat(catForm.budget_monthly) || 0,
    });
    if (error) {
      if (error.code === "23505") toast.error("Category already exists");
      else toast.error(error.message);
    } else {
      toast.success("Category added!");
      setCatForm({ name: "", budget_monthly: "" });
      setAddCatOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);
    const { error } = await supabase.from("expenses").insert({
      company_id: currentCompany.id,
      category_id: expForm.category_id || null,
      expense_date: expForm.expense_date,
      description: expForm.description,
      amount: parseFloat(expForm.amount) || 0,
      payment_method: expForm.payment_method,
      notes: expForm.notes || null,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Expense recorded!");
      setExpForm({ category_id: "", expense_date: format(new Date(), "yyyy-MM-dd"), description: "", amount: "", payment_method: "cash", notes: "" });
      setAddExpOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  const filtered = useMemo(() => {
    const fromStr = format(dateRange.from, "yyyy-MM-dd");
    const toStr = format(dateRange.to, "yyyy-MM-dd");
    return expenses.filter((e) => e.expense_date >= fromStr && e.expense_date <= toStr);
  }, [expenses, dateRange]);

  const stats = useMemo(() => {
    const totalFiltered = filtered.reduce((a, e) => a + Number(e.amount), 0);

    const byCat: Record<string, { spent: number; budget: number; name: string }> = {};
    categories.forEach((c) => {
      byCat[c.id] = { spent: 0, budget: Number(c.budget_monthly), name: c.name };
    });
    filtered.forEach((e) => {
      if (e.category_id && byCat[e.category_id]) {
        byCat[e.category_id].spent += Number(e.amount);
      }
    });

    const totalBudget = categories.reduce((a, c) => a + Number(c.budget_monthly), 0);
    const profitLoss = totalBudget > 0 ? totalBudget - totalFiltered : 0;

    return { totalMonth: totalFiltered, totalAll: filtered.length, byCat, totalBudget, profitLoss };
  }, [filtered, categories]);

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
          <h1 className="text-2xl font-bold font-display">Expenses</h1>
          <p className="text-sm text-muted-foreground mt-1">Budget tracking, categories & P&L</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: "expense_date", header: "Date" },
              { key: "description", header: "Description" },
              { key: "category_name", header: "Category" },
              { key: "payment_method", header: "Payment" },
              { key: "amount", header: "Amount (KSh)" },
              { key: "notes", header: "Notes" },
            ];
            downloadCSV(expenses.map(e => ({
              ...e,
              category_name: categories.find(c => c.id === e.category_id)?.name || "Uncategorized",
              amount: Number(e.amount).toFixed(2),
            })), cols, `expenses-${format(new Date(), "yyyy-MM-dd")}`);
            toast.success("CSV downloaded!");
          }}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const cols = [
              { key: "expense_date", header: "Date" },
              { key: "description", header: "Description" },
              { key: "category_name", header: "Category" },
              { key: "payment_method", header: "Payment" },
              { key: "amount", header: "Amount" },
            ];
            downloadPDF("Expenses Report", currentCompany?.name || "Company", cols,
              expenses.map(e => ({
                ...e,
                category_name: categories.find(c => c.id === e.category_id)?.name || "Uncategorized",
                amount: formatKES(Number(e.amount)),
              })),
              [
                { label: "This Month", value: formatKES(stats.totalMonth) },
                { label: "Budget", value: formatKES(stats.totalBudget) },
                { label: "Remaining", value: formatKES(Math.abs(stats.profitLoss)) },
              ]
            );
          }}>
            <FileText className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Dialog open={addCatOpen} onOpenChange={setAddCatOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><FolderPlus className="h-4 w-4 mr-1" /> Category</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Expense Category</DialogTitle></DialogHeader>
              <form onSubmit={handleAddCategory} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Category Name</Label>
                  <Input value={catForm.name} onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Utilities" required />
                </div>
                <div className="space-y-2">
                  <Label>Monthly Budget (KSh)</Label>
                  <Input type="number" min="0" step="0.01" value={catForm.budget_monthly} onChange={(e) => setCatForm((f) => ({ ...f, budget_monthly: e.target.value }))} placeholder="0.00" />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Category
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={addExpOpen} onOpenChange={setAddExpOpen}>
            <DialogTrigger asChild>
              <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Record Expense</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Record Expense</DialogTitle></DialogHeader>
              <form onSubmit={handleAddExpense} className="space-y-4 mt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" value={expForm.expense_date} onChange={(e) => setExpForm((f) => ({ ...f, expense_date: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount (KSh)</Label>
                    <Input type="number" min="0" step="0.01" value={expForm.amount} onChange={(e) => setExpForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} placeholder="What was this expense for?" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={expForm.category_id} onValueChange={(v) => setExpForm((f) => ({ ...f, category_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={expForm.payment_method} onValueChange={(v) => setExpForm((f) => ({ ...f, payment_method: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea value={expForm.notes} onChange={(e) => setExpForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional..." rows={2} />
                </div>
                <Button type="submit" className="w-full" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Record Expense
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
                <p className="text-xs text-muted-foreground">This Month's Expenses</p>
                <p className="text-2xl font-bold font-display">{formatKES(stats.totalMonth)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Monthly Budget</p>
                <p className="text-2xl font-bold font-display">{formatKES(stats.totalBudget)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <PieChart className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-card border-0">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Budget Remaining</p>
                <p className={`text-2xl font-bold font-display ${stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`}>
                  {stats.profitLoss >= 0 ? "" : "-"}{formatKES(Math.abs(stats.profitLoss))}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stats.profitLoss >= 0 ? "bg-success/10" : "bg-destructive/10"}`}>
                <Receipt className={`h-5 w-5 ${stats.profitLoss >= 0 ? "text-success" : "text-destructive"}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <Tabs defaultValue="expenses">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <TabsContent value="expenses">
          <motion.div variants={item}>
            <Card className="shadow-card border-0">
              <CardContent className="pt-6">
                {expenses.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-display font-semibold mb-1">No expenses recorded</h3>
                    <p className="text-sm text-muted-foreground">Add categories first, then record expenses</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((exp) => {
                          const cat = categories.find((c) => c.id === exp.category_id);
                          return (
                            <TableRow key={exp.id}>
                              <TableCell className="text-sm">{format(new Date(exp.expense_date), "MMM d, yyyy")}</TableCell>
                              <TableCell className="text-sm">{exp.description}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{cat?.name || "Uncategorized"}</Badge></TableCell>
                              <TableCell><Badge variant="secondary" className="capitalize text-xs">{exp.payment_method.replace("_", " ")}</Badge></TableCell>
                              <TableCell className="text-right font-medium text-destructive">{formatKES(Number(exp.amount))}</TableCell>
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
        </TabsContent>

        <TabsContent value="budgets">
          <motion.div variants={item}>
            <Card className="shadow-card border-0">
              <CardHeader><CardTitle className="text-base font-display">Budget vs Actual (This Month)</CardTitle></CardHeader>
              <CardContent>
                {categories.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Add expense categories to set budgets</p>
                ) : (
                  <div className="space-y-5">
                    {categories.map((cat) => {
                      const data = stats.byCat[cat.id] || { spent: 0, budget: 0, name: cat.name };
                      const pct = data.budget > 0 ? Math.min((data.spent / data.budget) * 100, 100) : 0;
                      const over = data.budget > 0 && data.spent > data.budget;
                      return (
                        <div key={cat.id} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="font-medium">{data.name}</span>
                            <span className={over ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {formatKES(data.spent)} / {formatKES(data.budget)}
                            </span>
                          </div>
                          <Progress value={pct} className={`h-2 ${over ? "[&>div]:bg-destructive" : ""}`} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
