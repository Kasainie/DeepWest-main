import { useState, useEffect } from "react";
import { subDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Minus, Wine, AlertTriangle, Package, Loader2,
  ShoppingCart, Send, Trash2, Beer, Coffee, Martini,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";
import { OrdersList } from "@/components/orders/OrdersList";
import { toast } from "sonner";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  is_available: boolean;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

interface BarItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  unit: string;
  low_threshold: number;
  cost_per_unit: number;
}

const drinkCategories = ["all", "cocktail", "beer", "wine", "spirit", "soft_drink", "snack"];

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

export default function Bar() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [inventory, setInventory] = useState<BarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("new-order");
  const [stats, setStats] = useState({ salesToday: 0, revenue: 0, lowStock: 0, totalItems: 0 });
  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 29), to: new Date() });

  useEffect(() => {
    if (currentCompany) {
      fetchMenu();
      fetchInventory();
      fetchStats();
    }
  }, [currentCompany?.id, dateRange]);

  const fetchMenu = async () => {
    if (!currentCompany) return;
    const isInitial = menuItems.length === 0;
    if (isInitial) setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("company_id", currentCompany.id)
      .eq("is_available", true)
      .order("category");
    setMenuItems((data || []) as MenuItem[]);
    setLoading(false);
  };

  const fetchInventory = async () => {
    if (!currentCompany) return;
    const { data } = await supabase
      .from("bar_inventory")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("name");
    setInventory((data || []) as BarItem[]);
  };

  const fetchStats = async () => {
    if (!currentCompany) return;
    const fromDate = format(dateRange.from, "yyyy-MM-dd");
    const toDate = format(dateRange.to, "yyyy-MM-dd");

    const [salesRes, inventoryRes] = await Promise.all([
      supabase
        .from("sales")
        .select("amount")
        .eq("company_id", currentCompany.id)
        .eq("department", "bar")
        .gte("sale_date", fromDate)
        .lte("sale_date", toDate),
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

  const addToCart = (menuItem: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === menuItem.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === menuItem.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [...prev, { menuItem, quantity: 1, notes: "" }];
    });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menuItem.id === itemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.menuItem.id !== itemId));
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.menuItem.price * c.quantity, 0);
  const tax = cartTotal * 0.1;

  const sendOrder = async () => {
    if (!currentCompany || !user || cart.length === 0) return;
    if (!tableNumber.trim()) {
      toast.error("Please enter a table/seat number");
      return;
    }
    setSending(true);

    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          company_id: currentCompany.id,
          table_number: tableNumber.trim(),
          subtotal: cartTotal,
          tax: tax,
          total: cartTotal + tax,
          notes: orderNotes || null,
          created_by: user.id,
          status: "pending",
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = cart.map((c) => ({
        order_id: order.id,
        menu_item_id: c.menuItem.id,
        name: c.menuItem.name,
        quantity: c.quantity,
        unit_price: c.menuItem.price,
        total_price: c.menuItem.price * c.quantity,
        notes: c.notes || null,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) throw itemsError;

      toast.success(`Order #${order.order_number} placed!`, {
        description: `Table/Seat ${tableNumber} · ${cart.length} item(s)`,
      });

      setCart([]);
      setTableNumber("");
      setOrderNotes("");
      setActiveTab("orders");
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to place order");
    } finally {
      setSending(false);
    }
  };

  const filteredMenu =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((m) => m.category === selectedCategory);

  const lowStockItems = inventory.filter((i) => i.stock <= i.low_threshold);

  const showInlineLoader = loading && menuItems.length === 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Bar & Lounge</h1>
          <p className="text-sm text-muted-foreground mt-1">Place orders, manage payments & inventory</p>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex items-center justify-end">
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Bar Revenue" value={`KSh ${stats.revenue.toLocaleString()}`} change="Selected period" changeType="neutral" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
        <StatCard title="Bar Sales" value={stats.salesToday} change="Selected period" changeType="neutral" icon={Wine} />
        <StatCard
          title="Low Stock"
          value={stats.lowStock}
          change={stats.lowStock > 0 ? "Needs restock" : "All good"}
          changeType={stats.lowStock > 0 ? "negative" : "positive"}
          icon={AlertTriangle}
        />
        <StatCard title="Inventory Items" value={stats.totalItems} change="Total" changeType="neutral" icon={Package} />
      </motion.div>

      <motion.div variants={item}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="new-order">New Order</TabsTrigger>
            <TabsTrigger value="orders">Orders & Payments</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
          </TabsList>

          {/* NEW ORDER TAB */}
          <TabsContent value="new-order" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Menu */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {drinkCategories.map((cat) => (
                    <Button
                      key={cat}
                      variant={selectedCategory === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(cat)}
                      className="capitalize text-xs"
                    >
                      {cat === "soft_drink" ? "Soft Drink" : cat}
                    </Button>
                  ))}
                </div>

                {filteredMenu.length === 0 ? (
                  <Card className="shadow-card border-0">
                    <CardContent className="text-center py-12">
                      <Wine className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {menuItems.length === 0
                          ? "No menu items yet. Go to Bar Admin to add items."
                          : "No items in this category"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMenu.map((mi) => {
                      const inCart = cart.find((c) => c.menuItem.id === mi.id);
                      const Icon = categoryIcon(mi.category);
                      return (
                        <Card
                          key={mi.id}
                          className={`shadow-card border-0 cursor-pointer hover:shadow-elevated transition-all ${inCart ? "ring-2 ring-primary" : ""}`}
                          onClick={() => addToCart(mi)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                                  <Icon className="h-4 w-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{mi.name}</p>
                                  {mi.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mi.description}</p>
                                  )}
                                  <Badge variant="secondary" className="text-[10px] capitalize mt-1">
                                    {mi.category.replace("_", " ")}
                                  </Badge>
                                </div>
                              </div>
                              <div className="text-right ml-3">
                                <p className="text-sm font-bold font-display">KSh {Number(mi.price).toFixed(2)}</p>
                                {inCart && (
                                  <Badge className="text-[10px] mt-1">×{inCart.quantity}</Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div>
                <Card className="shadow-card border-0 sticky top-6">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-display flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Bar Order
                      {cart.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{cart.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Table / Seat</Label>
                      <Input
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. Bar-1, T5"
                        className="h-8 text-sm"
                      />
                    </div>

                    {cart.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-6">
                        Tap menu items to add them
                      </p>
                    ) : (
                      <>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {cart.map((c) => (
                            <div key={c.menuItem.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{c.menuItem.name}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  KSh {Number(c.menuItem.price).toFixed(2)} each
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateQuantity(c.menuItem.id, -1); }}>
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-xs font-bold w-5 text-center">{c.quantity}</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); updateQuantity(c.menuItem.id, 1); }}>
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); removeFromCart(c.menuItem.id); }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <p className="text-xs font-bold w-14 text-right">
                                KSh {(c.menuItem.price * c.quantity).toFixed(2)}
                              </p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs">Notes</Label>
                          <Textarea
                            value={orderNotes}
                            onChange={(e) => setOrderNotes(e.target.value)}
                            placeholder="Special requests..."
                            rows={2}
                            className="text-xs"
                          />
                        </div>

                        <div className="border-t pt-2 space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>KSh {cartTotal.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Tax (10%)</span>
                            <span>KSh {tax.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>Total</span>
                            <span>KSh {(cartTotal + tax).toFixed(2)}</span>
                          </div>
                        </div>

                        <Button onClick={sendOrder} className="w-full" disabled={sending}>
                          {sending ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Place Order
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ORDERS & PAYMENTS TAB */}
          <TabsContent value="orders" className="mt-4">
            <OrdersList />
          </TabsContent>

          {/* INVENTORY TAB */}
          <TabsContent value="inventory" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {lowStockItems.length > 0 && (
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
              )}

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
                    inventory.map((i) => (
                      <div key={i.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div>
                          <p className="text-sm font-medium">{i.name}</p>
                          <p className="text-xs text-muted-foreground capitalize">{i.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-semibold ${i.stock <= i.low_threshold ? "text-warning" : ""}`}>{i.stock} {i.unit}</p>
                          <p className="text-xs text-muted-foreground">KSh {Number(i.cost_per_unit).toLocaleString()}/unit</p>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
