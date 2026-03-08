import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Minus, ShoppingCart, Send, Loader2, UtensilsCrossed, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { OrdersList } from "@/components/orders/OrdersList";
import { MenuManager } from "@/components/orders/MenuManager";

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

  useEffect(() => {
    if (currentCompany) fetchMenu();
  }, [currentCompany?.id]);

  const fetchMenu = async () => {
    if (!currentCompany) return;
    setLoading(true);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">Restaurant</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage orders, menu & kitchen flow</p>
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

                {filteredMenu.length === 0 ? (
                  <Card className="shadow-card border-0">
                    <CardContent className="text-center py-12">
                      <UtensilsCrossed className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                      <p className="text-sm text-muted-foreground">
                        {menuItems.length === 0
                          ? "No menu items yet. Go to 'Manage Menu' to add items."
                          : "No items in this category"}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredMenu.map((mi) => {
                      const inCart = cart.find((c) => c.menuItem.id === mi.id);
                      return (
                        <Card
                          key={mi.id}
                          className={`shadow-card border-0 cursor-pointer hover:shadow-elevated transition-all ${inCart ? "ring-2 ring-primary" : ""}`}
                          onClick={() => addToCart(mi)}
                        >
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{mi.name}</p>
                                {mi.description && (
                                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{mi.description}</p>
                                )}
                                <Badge variant="secondary" className="text-[10px] capitalize mt-1">
                                  {mi.category}
                                </Badge>
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
                      Current Order
                      {cart.length > 0 && (
                        <Badge variant="secondary" className="text-[10px]">{cart.length}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Table Number</Label>
                      <Input
                        value={tableNumber}
                        onChange={(e) => setTableNumber(e.target.value)}
                        placeholder="e.g. T1"
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
                          <Label className="text-xs">Notes for kitchen</Label>
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
                          Send to Kitchen
                        </Button>
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
    </motion.div>
  );
}
