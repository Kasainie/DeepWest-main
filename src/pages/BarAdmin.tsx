import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/StatCard";
import {
  Wine, Plus, Loader2, DollarSign, TrendingUp, Package, Users,
  Pencil, Trash2, Beer, Coffee, Martini, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const drinkCategories = ["cocktail", "beer", "wine", "spirit", "soft_drink", "snack"];

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  is_available: boolean;
}

interface StaffMember {
  id: string;
  full_name: string;
  staff_code: string;
  role: string;
  is_active: boolean;
}

interface InventoryItem {
  name: string;
  stock: number;
  unit: string;
  lowThreshold: number;
}

// Mock inventory data (would be a real table in production)
const mockInventory: InventoryItem[] = [
  { name: "Vodka (750ml)", stock: 12, unit: "bottles", lowThreshold: 5 },
  { name: "Whiskey (750ml)", stock: 3, unit: "bottles", lowThreshold: 5 },
  { name: "Craft IPA Kegs", stock: 2, unit: "kegs", lowThreshold: 3 },
  { name: "House Red Wine", stock: 18, unit: "bottles", lowThreshold: 8 },
  { name: "Tonic Water", stock: 4, unit: "cases", lowThreshold: 6 },
  { name: "Lime Juice", stock: 8, unit: "bottles", lowThreshold: 4 },
  { name: "Simple Syrup", stock: 6, unit: "bottles", lowThreshold: 3 },
  { name: "Champagne", stock: 7, unit: "bottles", lowThreshold: 4 },
];

export default function BarAdmin() {
  const { currentCompany } = useCompany();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [barStaff, setBarStaff] = useState<StaffMember[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuForm, setMenuForm] = useState({
    name: "", category: "cocktail", price: "", description: "",
  });

  useEffect(() => {
    if (currentCompany) fetchAll();
  }, [currentCompany?.id]);

  const fetchAll = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const [menuRes, staffRes, ordersRes] = await Promise.all([
      supabase.from("menu_items").select("*").eq("company_id", currentCompany.id).order("category"),
      supabase.from("company_staff").select("id, full_name, staff_code, role, is_active")
        .eq("company_id", currentCompany.id)
        .in("department", ["bar", "bar_admin"]),
      supabase.from("orders").select("*, order_items(*)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    setMenuItems((menuRes.data || []) as MenuItem[]);
    setBarStaff((staffRes.data || []) as StaffMember[]);
    setOrders(ordersRes.data || []);
    setLoading(false);
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { error } = await supabase.from("menu_items").insert({
      company_id: currentCompany.id,
      name: menuForm.name.trim(),
      category: menuForm.category,
      price: parseFloat(menuForm.price) || 0,
      description: menuForm.description.trim() || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Menu item added!");
      setMenuForm({ name: "", category: "cocktail", price: "", description: "" });
      setAddMenuOpen(false);
      fetchAll();
    }
    setSaving(false);
  };

  const handleToggleAvailable = async (itemId: string, current: boolean) => {
    const { error } = await supabase.from("menu_items").update({ is_available: !current }).eq("id", itemId);
    if (!error) {
      setMenuItems((prev) => prev.map((m) => m.id === itemId ? { ...m, is_available: !current } : m));
      toast.success(current ? "Item marked unavailable" : "Item marked available");
    }
  };

  const handleDeleteMenuItem = async (itemId: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", itemId);
    if (!error) {
      setMenuItems((prev) => prev.filter((m) => m.id !== itemId));
      toast.success("Menu item removed");
    } else {
      toast.error("Failed to remove item");
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const avgCheck = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const lowStockItems = mockInventory.filter((i) => i.stock <= i.lowThreshold);

  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "cocktail": return Martini;
      case "beer": return Beer;
      case "wine": return Wine;
      case "spirit": return Wine;
      case "soft_drink": return Coffee;
      default: return Wine;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Bar Admin Panel</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage bar menu, orders, staff & inventory
          </p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Bar Revenue" value={`$${totalRevenue.toFixed(2)}`} change="Recent" changeType="neutral" icon={DollarSign} />
        <StatCard title="Orders" value={`${totalOrders}`} change="Last 20" changeType="neutral" icon={TrendingUp} />
        <StatCard title="Avg Check" value={`$${avgCheck.toFixed(2)}`} change="" changeType="neutral" icon={DollarSign} />
        <StatCard title="Low Stock" value={`${lowStockItems.length}`} change={lowStockItems.length > 0 ? "Needs attention" : "All good"} changeType={lowStockItems.length > 0 ? "negative" : "positive"} icon={Package} />
      </motion.div>

      {/* Tabs */}
      <motion.div variants={item}>
        <Tabs defaultValue="menu" className="space-y-4">
          <TabsList>
            <TabsTrigger value="menu">Menu Items</TabsTrigger>
            <TabsTrigger value="orders">Orders & Sales</TabsTrigger>
            <TabsTrigger value="staff">Bar Staff</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* MENU TAB */}
          <TabsContent value="menu" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={addMenuOpen} onOpenChange={setAddMenuOpen}>
                <DialogTrigger asChild>
                  <Button><Plus className="h-4 w-4 mr-2" />Add Item</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="font-display">Add Bar Menu Item</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddMenuItem} className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input value={menuForm.name} onChange={(e) => setMenuForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Espresso Martini" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Select value={menuForm.category} onValueChange={(v) => setMenuForm((f) => ({ ...f, category: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {drinkCategories.map((c) => (
                              <SelectItem key={c} value={c} className="capitalize">{c.replace("_", " ")}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Price</Label>
                        <Input type="number" step="0.01" min="0" value={menuForm.price} onChange={(e) => setMenuForm((f) => ({ ...f, price: e.target.value }))} placeholder="0.00" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={menuForm.description} onChange={(e) => setMenuForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
                    </div>
                    <Button type="submit" className="w-full" disabled={saving}>
                      {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Item
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <Card className="shadow-card border-0">
              <CardContent className="pt-6">
                {menuItems.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No menu items yet. Add your first item above.</p>
                ) : (
                  <div className="space-y-1">
                    {menuItems.map((mi) => {
                      const Icon = categoryIcon(mi.category);
                      return (
                        <div key={mi.id} className={`flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors ${!mi.is_available ? "opacity-50" : ""}`}>
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-medium">{mi.name}</p>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[10px] capitalize">{mi.category.replace("_", " ")}</Badge>
                                {mi.description && <span className="text-xs text-muted-foreground">{mi.description}</span>}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold">${mi.price.toFixed(2)}</span>
                            <Switch checked={mi.is_available} onCheckedChange={() => handleToggleAvailable(mi.id, mi.is_available)} className="scale-75" />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDeleteMenuItem(mi.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ORDERS TAB */}
          <TabsContent value="orders">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-display">Recent Bar Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No orders yet.</p>
                ) : (
                  <div className="space-y-1">
                    {orders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">Order #{order.order_number}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {order.table_number && <Badge variant="secondary" className="text-[10px]">Table {order.table_number}</Badge>}
                            <Badge variant={order.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">{order.status}</Badge>
                            <Badge variant={order.payment_status === "paid" ? "default" : "destructive"} className="text-[10px] capitalize">{order.payment_status}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">${order.total?.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(order.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* STAFF TAB */}
          <TabsContent value="staff">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Users className="h-5 w-5" /> Bar Staff
                </CardTitle>
              </CardHeader>
              <CardContent>
                {barStaff.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No bar staff assigned. Add staff via Staff Management.</p>
                ) : (
                  <div className="space-y-1">
                    {barStaff.map((s) => (
                      <div key={s.id} className={`flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors ${!s.is_active ? "opacity-50" : ""}`}>
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                            {s.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{s.full_name}</p>
                            <Badge variant="secondary" className="text-[10px] capitalize">{s.role}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-secondary px-2 py-1 rounded">{s.staff_code}</code>
                          {s.is_active ? (
                            <Badge className="bg-success/10 text-success border-0 text-[10px]">Active</Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">Inactive</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory">
            <Card className="shadow-card border-0">
              <CardHeader>
                <CardTitle className="text-lg font-display flex items-center gap-2">
                  <Package className="h-5 w-5" /> Bar Inventory
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {mockInventory.map((inv, i) => {
                    const isLow = inv.stock <= inv.lowThreshold;
                    return (
                      <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          {isLow && <AlertTriangle className="h-4 w-4 text-warning shrink-0" />}
                          <div>
                            <p className="text-sm font-medium">{inv.name}</p>
                            <p className="text-xs text-muted-foreground">{inv.stock} {inv.unit} remaining</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isLow ? "bg-warning" : "bg-primary"}`}
                              style={{ width: `${Math.min(100, (inv.stock / (inv.lowThreshold * 3)) * 100)}%` }}
                            />
                          </div>
                          {isLow && <Badge variant="secondary" className="text-[10px] text-warning">Low</Badge>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
