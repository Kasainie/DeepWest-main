import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Wine, AlertTriangle, Package, Loader2 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface BarItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  low_threshold: number;
  cost_per_unit: number;
}

export default function Bar() {
  const { currentCompany } = useCompany();
  const [inventory, setInventory] = useState<BarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ salesToday: 0, revenue: 0, lowStock: 0, totalItems: 0 });

  useEffect(() => {
    if (currentCompany) {
      fetchInventory();
      fetchStats();
    }
  }, [currentCompany?.id]);

  const fetchInventory = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("bar_inventory")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("name");
    setInventory((data || []) as BarItem[]);
    setLoading(false);
  };

  const fetchStats = async () => {
    if (!currentCompany) return;
    const today = new Date().toISOString().split("T")[0];

    const [salesRes, inventoryRes] = await Promise.all([
      supabase
        .from("sales")
        .select("amount")
        .eq("company_id", currentCompany.id)
        .eq("department", "bar")
        .gte("sale_date", today),
      supabase
        .from("bar_inventory")
        .select("id, stock, low_threshold")
        .eq("company_id", currentCompany.id),
    ]);

    const sales = salesRes.data || [];
    const inv = inventoryRes.data || [];
    const lowStock = inv.filter((i) => i.stock <= i.low_threshold).length;

    setStats({
      salesToday: sales.length,
      revenue: sales.reduce((sum, s) => sum + Number(s.amount), 0),
      lowStock,
      totalItems: inv.length,
    });
  };

  const lowStockItems = inventory.filter((i) => i.stock <= i.low_threshold);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Bar & Lounge</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage bar inventory & sales</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Order</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Bar Revenue" value={`KSh ${stats.revenue.toLocaleString()}`} change="Today" changeType="neutral" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
        <StatCard title="Bar Sales" value={stats.salesToday} change="Today" changeType="neutral" icon={Wine} />
        <StatCard
          title="Low Stock"
          value={stats.lowStock}
          change={stats.lowStock > 0 ? "Needs restock" : "All good"}
          changeType={stats.lowStock > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
        />
        <StatCard title="Inventory Items" value={stats.totalItems} change="Total" changeType="neutral" icon={Package} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {lowStockItems.length > 0 && (
          <motion.div variants={item}>
            <Card className="shadow-card border-0 border-l-4 border-l-warning">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-warning" />
                  Low Stock Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowStockItems.map((i) => (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/5">
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{i.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-warning">{i.stock} {i.unit}</p>
                      <p className="text-[10px] text-muted-foreground">Min: {i.low_threshold}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-display">Inventory Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {inventory.length === 0 ? (
                <div className="text-center py-8">
                  <Wine className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No inventory items. Go to Bar Admin to add items.</p>
                </div>
              ) : (
                inventory.slice(0, 10).map((i) => (
                  <div key={i.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{i.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{i.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{i.stock} {i.unit}</p>
                      <p className="text-xs text-muted-foreground">KSh {Number(i.cost_per_unit).toLocaleString()}/unit</p>
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
