import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getLocalDayBoundsUTC } from "@/lib/dateUtils";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, Send, Loader2, UtensilsCrossed, Trash2, ClipboardList, DollarSign, Utensils } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { OrderHistory } from "@/components/OrderHistory";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OrdersList } from "@/components/orders/OrdersList";
import { MenuManager } from "@/components/orders/MenuManager";
import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";

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

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const categories = ["all", "starter", "main", "side", "dessert", "drink"];

export default function Restaurant() {
  const { currentCompany } = useCompany();
  const { user } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("new-order");
  const [bottomTab, setBottomTab] = useState<"home" | "history">("home");
  const [stats, setStats] = useState({ ordersToday: 0, revenueToday: 0, activeOrders: 0, menuCount: 0 });
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });

  useEffect(() => {
    if (currentCompany) {
      fetchMenu();
      fetchStats();
    }
  }, [currentCompany?.id, dateRange]);

  const fetchStats = async () => {
    if (!currentCompany) return;
    const { start: rangeStart } = getLocalDayBoundsUTC(dateRange.from);
    const { end: rangeEnd } = getLocalDayBoundsUTC(dateRange.to);

    const [ordersRes, activeRes, menuRes] = await Promise.all([
      supabase
        .from("orders")
        .select("total")
        .eq("company_id", currentCompany.id)
        .gte("created_at", rangeStart)
        .lte("created_at", rangeEnd),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("company_id", currentCompany.id)
        .in("status", ["pending", "preparing", "ready"]),
      supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("company_id", currentCompany.id)
        .eq("is_available", true),
    ]);

    const orders = ordersRes.data || [];
    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

    setStats({
      ordersToday: orders.length,
      revenueToday: revenue,
      activeOrders: activeRes.count || 0,
      menuCount: menuRes.count || 0,
    });
  };

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
      toast.error("Please enter a table number");
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

      toast.success(`Order #${order.order_number} sent to kitchen!`, {
        description: `Table ${tableNumber} · ${cart.length} item(s)`,
      });

      setCart([]);
      setTableNumber("");
      setOrderNotes("");
      setActiveTab("orders");
      fetchStats();
    } catch (err: any) {
      toast.error(err.message || "Failed to send order");
    } finally {
      setSending(false);
    }
  };

  const filteredMenu =
    selectedCategory === "all"
      ? menuItems
      : menuItems.filter((m) => m.category === selectedCategory);

  const showInlineLoader = loading && menuItems.length === 0;

  return (
    <div className="pb-16">
      {bottomTab === "home" ? (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item}>
            <h1 className="text-2xl font-bold font-display">Restaurant</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage orders, menu & kitchen flow</p>
          </motion.div>

          <motion.div variants={item} className="flex items-center justify-end">
            <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          </motion.div>

          <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard title="Total Orders" value={stats.ordersToday} change="Selected period" changeType="neutral" icon={ClipboardList} />
            <StatCard title="Total Revenue" value={`KSh ${stats.revenueToday.toLocaleString()}`} change="Selected period" changeType="neutral" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
            <StatCard title="Active Orders" value={stats.activeOrders} change="In progress" changeType="neutral" icon={Utensils} />
            <StatCard title="Menu Items" value={stats.menuCount} change="Available" changeType="neutral" icon={UtensilsCrossed} />
          </motion.div>

          <motion.div variants={item}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="new-order">New Order</TabsTrigger>
                <TabsTrigger value="orders">Active Orders</TabsTrigger>
                <TabsTrigger value="menu">Manage Menu</TabsTrigger>
              </TabsList>

              <TabsContent value="new-order" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Menu */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((cat) => (
                        <Button
                          key={cat}
                          variant={selectedCategory === cat ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat)}
                          className="capitalize text-xs"
                        >
                          {cat}
                        </Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredMenu.map((mi) => {
                        const inCart = cart.find((c) => c.menuItem.id === mi.id);
                        return (
                          <Card key={mi.id} className={`shadow-sm transition-all ${!mi.is_available ? "opacity-50" : ""}`}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <p className="font-medium text-sm">{mi.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{mi.category}</p>
                                </div>
                                <span className="font-semibold text-sm">KSh {mi.price.toLocaleString()}</span>
                              </div>
                              {mi.description && <p className="text-[10px] text-muted-foreground mb-2">{mi.description}</p>}
                              <div className="flex items-center gap-2">
                                {inCart ? (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(mi.id, -1)}>
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm font-medium w-6 text-center">{inCart.quantity}</span>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(mi.id, 1)}>
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-destructive" onClick={() => removeFromCart(mi.id)}>
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button size="sm" className="h-7 text-xs" disabled={!mi.is_available} onClick={() => addToCart(mi)}>
                                    <Plus className="h-3 w-3 mr-1" /> Add
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cart */}
                  <div>
                    <Card className="shadow-card sticky top-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2">
                          <ShoppingCart className="h-4 w-4" /> Cart ({cart.reduce((s, c) => s + c.quantity, 0)})
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {cart.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">No items in cart</p>
                        ) : (
                          <>
                            {cart.map((c) => (
                              <div key={c.menuItem.id} className="flex items-center justify-between text-sm">
                                <div>
                                  <p className="font-medium">{c.menuItem.name}</p>
                                  <p className="text-xs text-muted-foreground">×{c.quantity} · KSh {(c.menuItem.price * c.quantity).toLocaleString()}</p>
                                </div>
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeFromCart(c.menuItem.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            ))}
                            <div className="border-t pt-2 space-y-1 text-sm">
                              <div className="flex justify-between"><span>Subtotal</span><span>KSh {cartTotal.toLocaleString()}</span></div>
                              <div className="flex justify-between text-muted-foreground"><span>Tax (10%)</span><span>KSh {tax.toLocaleString()}</span></div>
                              <div className="flex justify-between font-bold"><span>Total</span><span>KSh {(cartTotal + tax).toLocaleString()}</span></div>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <Label className="text-xs">Table Number *</Label>
                                <Input placeholder="e.g. 5" value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div>
                                <Label className="text-xs">Notes</Label>
                                <Textarea placeholder="Special instructions..." value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="text-sm min-h-[60px]" />
                              </div>
                              <Button className="w-full" onClick={sendOrder} disabled={sending || cart.length === 0}>
                                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                                Send to Kitchen
                              </Button>
                            </div>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="orders" className="mt-4">
                <OrdersList />
              </TabsContent>

              <TabsContent value="menu" className="mt-4">
                <MenuManager onMenuChange={fetchMenu} />
              </TabsContent>
            </Tabs>
          </motion.div>
          )}
        </motion.div>
      ) : (
        <OrderHistory />
      )}
      <BottomTabBar activeTab={bottomTab} onTabChange={setBottomTab} />
    </div>
  );
}
