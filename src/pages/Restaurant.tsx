import { useState, useEffect, useCallback } from "react";
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
import { Plus, Minus, ShoppingCart, Send, Loader2, UtensilsCrossed, Trash2, ClipboardList, Utensils, Search } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { OrderHistory } from "@/components/OrderHistory";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OrdersList } from "@/components/orders/OrdersList";
import { MenuManager } from "@/components/orders/MenuManager";
import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";
import { hasStaffAccess } from "@/lib/staffAccess";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  is_available: boolean;
  stockQuantity: number;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  notes: string;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const categories = ["all", "breakfast", "snacks", "soft drinks", "starter", "main", "side", "dessert", "drink"];

export default function Restaurant({ waiterMode = false }: { waiterMode?: boolean }) {
  const { currentCompany, companyRole, staffDepartment, staffPermissions, staffRole } = useCompany();
  const { user } = useAuth();
  const isWaiterMode = waiterMode || staffRole?.toLowerCase() === "waiter";
  const canManageOrders = hasStaffAccess(
    companyRole,
    staffDepartment,
    staffPermissions,
    "restaurant.orders",
  );
  const showUnpaidOrdersBadge = canManageOrders && !isWaiterMode;
  const canManageMenu = hasStaffAccess(
    companyRole,
    staffDepartment,
    staffPermissions,
    "restaurant.menu",
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tableNumber, setTableNumber] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [sending, setSending] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [menuSearch, setMenuSearch] = useState("");
  const [activeTab, setActiveTab] = useState(isWaiterMode ? "orders" : "new-order");
  const [preparingOrdersCount, setPreparingOrdersCount] = useState(0);
  const [unpaidOrdersCount, setUnpaidOrdersCount] = useState(0);
  const [bottomTab, setBottomTab] = useState<"home" | "history">("home");
  const [stats, setStats] = useState({ ordersToday: 0, revenueToday: 0, activeOrders: 0, menuCount: 0 });
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });

  const fetchStats = useCallback(async () => {
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
  }, [currentCompany, dateRange]);

  const fetchUnpaidOrdersCount = useCallback(async () => {
    if (!currentCompany || !showUnpaidOrdersBadge) {
      setUnpaidOrdersCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("company_id", currentCompany.id)
      .neq("status", "cancelled")
      .neq("payment_status", "paid");

    if (error) {
      toast.error("Failed to load the number of unpaid orders");
      return;
    }

    setUnpaidOrdersCount(count || 0);
  }, [currentCompany, showUnpaidOrdersBadge]);

  useEffect(() => {
    if (!currentCompany || !showUnpaidOrdersBadge) {
      setUnpaidOrdersCount(0);
      return;
    }

    fetchUnpaidOrdersCount();
    const channel = supabase
      .channel(`cashier-unpaid-orders-${currentCompany.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        fetchUnpaidOrdersCount,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentCompany, fetchUnpaidOrdersCount, showUnpaidOrdersBadge]);

  const fetchMenu = useCallback(async () => {
    if (!currentCompany) return;
    const isInitial = menuItems.length === 0;
    if (isInitial) setLoading(true);
    const [menuRes, stockRes] = await Promise.all([
      supabase
        .from("menu_items")
        .select("*")
        .eq("company_id", currentCompany.id)
        .eq("is_available", true)
        .order("category"),
      supabase
        .from("inventory_stock_balances")
        .select("menu_item_id, quantity")
        .eq("company_id", currentCompany.id),
    ]);

    if (menuRes.error || stockRes.error) {
      toast.error(menuRes.error?.message || stockRes.error?.message || "Failed to load menu stock");
      setLoading(false);
      return;
    }

    const quantities = new Map(
      (stockRes.data || []).flatMap((balance) =>
        balance.menu_item_id ? [[balance.menu_item_id, balance.quantity] as const] : [],
      ),
    );
    setMenuItems((menuRes.data || []).map((menuItem) => ({
      ...menuItem,
      stockQuantity: quantities.get(menuItem.id) || 0,
    })));
    setLoading(false);
  }, [currentCompany, menuItems.length]);

  useEffect(() => {
    if (currentCompany) {
      fetchMenu();
      if (!isWaiterMode && canManageOrders) fetchStats();
    }
  }, [currentCompany, dateRange, isWaiterMode, canManageOrders, fetchMenu, fetchStats]);

  useEffect(() => {
    if (!canManageOrders && canManageMenu) {
      setActiveTab("menu");
    } else if (!canManageMenu && activeTab === "menu") {
      setActiveTab(isWaiterMode ? "orders" : "new-order");
    }
  }, [activeTab, canManageMenu, canManageOrders, isWaiterMode]);

  useEffect(() => {
    if (!currentCompany) return;
    const channel = supabase
      .channel(`restaurant-stock-${currentCompany.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory_stock_balances",
          filter: `company_id=eq.${currentCompany.id}`,
        },
        () => fetchMenu(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [currentCompany, fetchMenu]);

  const addToCart = (menuItem: MenuItem) => {
    const existing = cart.find((cartItem) => cartItem.menuItem.id === menuItem.id);
    if (menuItem.stockQuantity <= 0) {
      toast.error(`${menuItem.name} is out of stock. Restock it before ordering.`);
      return;
    }
    if (existing && existing.quantity >= menuItem.stockQuantity) {
      toast.error(`Only ${menuItem.stockQuantity} ${menuItem.name} available`);
      return;
    }
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
    if (delta > 0) {
      const cartItem = cart.find((item) => item.menuItem.id === itemId);
      if (cartItem && cartItem.quantity >= cartItem.menuItem.stockQuantity) {
        toast.error(`Only ${cartItem.menuItem.stockQuantity} ${cartItem.menuItem.name} available`);
        return;
      }
    }
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

  const sendOrder = async () => {
    if (!currentCompany || !user || cart.length === 0) return;
    if (!tableNumber.trim()) {
      toast.error("Please enter a table number");
      return;
    }
    setSending(true);

    try {
      const { data, error } = await supabase.rpc("create_restaurant_order", {
        _company_id: currentCompany.id,
        _table_number: tableNumber.trim(),
        _notes: orderNotes,
        _items: cart.map((cartItem) => ({
          menu_item_id: cartItem.menuItem.id,
          quantity: cartItem.quantity,
          notes: cartItem.notes || null,
        })),
      });

      if (error) throw error;
      const order = data?.[0];
      if (!order) throw new Error("Order was not created");

      toast.success(`Order #${order.order_number} sent to kitchen!`, {
        description: `Table ${tableNumber} · ${cart.length} item(s)`,
      });

      setCart([]);
      setTableNumber("");
      setOrderNotes("");
      setActiveTab("orders");
      fetchStats();
      fetchMenu();
    } catch (err: unknown) {
      const errorMessage =
        typeof err === "object" && err !== null && "message" in err && typeof err.message === "string"
          ? err.message
          : "Failed to send order";
      toast.error(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const normalizedMenuSearch = menuSearch.trim().toLowerCase();
  const filteredMenu = menuItems.filter((menuItem) => {
    const matchesCategory = selectedCategory === "all" || menuItem.category === selectedCategory;
    const matchesSearch =
      !normalizedMenuSearch ||
      `${menuItem.name} ${menuItem.category} ${menuItem.description || ""}`
        .toLowerCase()
        .includes(normalizedMenuSearch);
    return matchesCategory && matchesSearch;
  });

  const showInlineLoader = loading && menuItems.length === 0;

  return (
    <div className={!isWaiterMode || canManageOrders ? "pb-16" : ""}>
      {bottomTab === "home" || !canManageOrders ? (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={item}>
            <h1 className="text-2xl font-bold font-display">{isWaiterMode ? "Waiter Dashboard" : "Restaurant"}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isWaiterMode ? "Create orders and follow their progress from the kitchen" : "Manage orders, menu & kitchen flow"}
            </p>
          </motion.div>

          {!isWaiterMode && canManageOrders && (
            <>
              <motion.div variants={item} className="flex items-center justify-end">
                <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
              </motion.div>

              <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard title="Total Orders" value={stats.ordersToday} change="Selected period" changeType="neutral" icon={ClipboardList} />
                <StatCard title="Total Revenue" value={`KSh ${stats.revenueToday.toLocaleString()}`} change="Selected period" changeType="neutral" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
                <StatCard title="Active Orders" value={stats.activeOrders} change="In progress" changeType="neutral" icon={Utensils} />
                <StatCard title="Menu Items" value={stats.menuCount} change="Available" changeType="neutral" icon={UtensilsCrossed} />
              </motion.div>
            </>
          )}

          {showInlineLoader ? (
            <div className="flex items-center justify-center min-h-[300px]">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
          <motion.div variants={item}>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                {canManageOrders && (
                  <>
                    <TabsTrigger value="new-order">New Order</TabsTrigger>
                    <TabsTrigger value="orders">
                      {isWaiterMode ? "Kitchen Orders" : "Active Orders"}
                      {isWaiterMode && preparingOrdersCount > 0 && (
                        <span
                          aria-label={`${preparingOrdersCount} active kitchen orders`}
                          className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-semibold text-primary-foreground"
                        >
                          {preparingOrdersCount}
                        </span>
                      )}
                      {showUnpaidOrdersBadge && unpaidOrdersCount > 0 && (
                        <span
                          aria-label={`${unpaidOrdersCount} unpaid orders`}
                          className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-xs font-semibold text-destructive-foreground"
                        >
                          {unpaidOrdersCount}
                        </span>
                      )}
                    </TabsTrigger>
                  </>
                )}
                {!isWaiterMode && canManageMenu && <TabsTrigger value="menu">Manage Menu</TabsTrigger>}
              </TabsList>

              {canManageOrders && <TabsContent value="new-order" className="mt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        aria-label="Search menu items"
                        placeholder="Search menu items..."
                        value={menuSearch}
                        onChange={(e) => setMenuSearch(e.target.value)}
                        className="h-9 pl-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {categories.map((cat) => (
                        <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)} className="capitalize text-xs">{cat}</Button>
                      ))}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredMenu.length === 0 && (
                        <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                          No menu items found. Try another search or category.
                        </p>
                      )}
                      {filteredMenu.map((mi) => {
                        const inCart = cart.find((c) => c.menuItem.id === mi.id);
                        return (
                          <Card key={mi.id} className={`shadow-sm transition-all ${mi.stockQuantity <= 0 ? "opacity-60" : ""}`}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between mb-1">
                                <div>
                                  <p className="font-medium text-sm">{mi.name}</p>
                                  <p className="text-xs text-muted-foreground capitalize">{mi.category}</p>
                                </div>
                                <span className="font-semibold text-sm">KSh {mi.price.toLocaleString()}</span>
                              </div>
                              {mi.description && <p className="text-[10px] text-muted-foreground mb-2">{mi.description}</p>}
                              <p className={`mb-2 text-xs ${mi.stockQuantity > 0 ? "text-muted-foreground" : "font-medium text-destructive"}`}>
                                {mi.stockQuantity > 0 ? `${mi.stockQuantity} in stock` : "Out of stock"}
                              </p>
                              <div className="flex items-center gap-2">
                                {inCart ? (
                                  <>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => updateQuantity(mi.id, -1)}><Minus className="h-3 w-3" /></Button>
                                    <span className="text-sm font-medium w-6 text-center">{inCart.quantity}</span>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={inCart.quantity >= mi.stockQuantity} onClick={() => updateQuantity(mi.id, 1)}><Plus className="h-3 w-3" /></Button>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 ml-auto text-destructive" onClick={() => removeFromCart(mi.id)}><Trash2 className="h-3 w-3" /></Button>
                                  </>
                                ) : (
                                  <Button size="sm" className="h-7 text-xs" disabled={!mi.is_available || mi.stockQuantity <= 0} onClick={() => addToCart(mi)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
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
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-destructive" onClick={() => removeFromCart(c.menuItem.id)}><Trash2 className="h-3 w-3" /></Button>
                              </div>
                            ))}
                            <div className="border-t pt-2 space-y-1 text-sm">
                              <div className="flex justify-between"><span>Subtotal</span><span>KSh {cartTotal.toLocaleString()}</span></div>
                              <div className="flex justify-between font-bold"><span>Total</span><span>KSh {cartTotal.toLocaleString()}</span></div>
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
              </TabsContent>}

              {canManageOrders && <TabsContent value="orders" className="mt-4">
                <OrdersList
                  mode={isWaiterMode ? "waiter" : "restaurant"}
                  onOrderDeleted={fetchStats}
                  onKitchenOrdersCountChange={setPreparingOrdersCount}
                />
              </TabsContent>}

              {!isWaiterMode && canManageMenu && (
                <TabsContent value="menu" className="mt-4">
                  <MenuManager onMenuChange={fetchMenu} />
                </TabsContent>
              )}
            </Tabs>
          </motion.div>
          )}
        </motion.div>
      ) : (
        <OrderHistory />
      )}
      {canManageOrders && <BottomTabBar activeTab={bottomTab} onTabChange={setBottomTab} />}
    </div>
  );
}
