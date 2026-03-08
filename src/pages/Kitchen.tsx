import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Clock, ChefHat, Flame, Download, Printer, ClipboardList, Timer, CheckCircle } from "lucide-react";
import { BottomTabBar } from "@/components/BottomTabBar";
import { OrderHistory } from "@/components/OrderHistory";
import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { generateReceipt, printReceipt } from "@/lib/receipt";
import { getLocalDayBoundsUTC } from "@/lib/dateUtils";

interface OrderWithItems {
  id: string;
  order_number: number;
  table_number: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  order_items: {
    id: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    notes: string | null;
    status: string;
  }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/30",
  preparing: "bg-primary/10 text-primary border-primary/30",
  ready: "bg-success/10 text-success border-success/30",
};

const statusIcons: Record<string, typeof Clock> = {
  pending: Clock,
  preparing: Flame,
  ready: Check,
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariant = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

// Distinct sounds: urgent bell for new orders, gentle chime for status updates
const NEW_ORDER_SOUND = "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3";
const STATUS_CHANGE_SOUND = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";

export default function Kitchen() {
  const { currentCompany } = useCompany();
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [bottomTab, setBottomTab] = useState<"home" | "history">("home");
  const [completedToday, setCompletedToday] = useState(0);
  const [totalItemsToday, setTotalItemsToday] = useState(0);
  const newOrderAudioRef = useRef<HTMLAudioElement | null>(null);
  const statusAudioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback((type: "new_order" | "status_change") => {
    try {
      if (type === "new_order") {
        if (!newOrderAudioRef.current) {
          newOrderAudioRef.current = new Audio(NEW_ORDER_SOUND);
        }
        newOrderAudioRef.current.volume = 0.9;
        newOrderAudioRef.current.currentTime = 0;
        newOrderAudioRef.current.play().catch(() => {});
      } else {
        if (!statusAudioRef.current) {
          statusAudioRef.current = new Audio(STATUS_CHANGE_SOUND);
        }
        statusAudioRef.current.volume = 0.6;
        statusAudioRef.current.currentTime = 0;
        statusAudioRef.current.play().catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (currentCompany) {
      fetchOrders();
      const channel = supabase
        .channel("kitchen-orders")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders", filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
          const newOrder = payload.new as any;
          if (["pending", "preparing"].includes(newOrder.status)) {
            playSound("new_order");
            toast.info(`🔔 New Order #${newOrder.order_number}`, {
              description: newOrder.table_number ? `Table ${newOrder.table_number}` : "No table",
            });
          }
          fetchOrders();
        })
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `company_id=eq.${currentCompany.id}` }, (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          if (updated.status === "pending" && old.status !== "pending") {
            playSound("new_order");
            toast.info(`🔔 Order #${updated.order_number} sent to kitchen`);
          } else if (updated.status !== old.status) {
            playSound("status_change");
          }
          fetchOrders();
        })
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    }
  }, [currentCompany?.id, playSound]);

  const fetchOrders = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { start, end } = getLocalDayBoundsUTC(new Date());

    const [activeRes, completedRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*, order_items(*)")
        .eq("company_id", currentCompany.id)
        .in("status", ["pending", "preparing", "ready"])
        .order("created_at", { ascending: true }),
      supabase
        .from("orders")
        .select("id, order_items(id)")
        .eq("company_id", currentCompany.id)
        .in("status", ["served", "completed"])
        .gte("created_at", start)
        .lte("created_at", end),
    ]);

    const activeOrders = (activeRes.data || []) as OrderWithItems[];
    setOrders(activeOrders);

    const completedOrders = completedRes.data || [];
    setCompletedToday(completedOrders.length);
    
    const activeItems = activeOrders.reduce((sum, o) => sum + o.order_items.length, 0);
    const completedItems = completedOrders.reduce((sum: number, o: any) => sum + (o.order_items?.length || 0), 0);
    setTotalItemsToday(activeItems + completedItems);

    setLoading(false);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    setUpdating(orderId);
    const updateData: any = { status: newStatus };
    if (newStatus === "ready") updateData.completed_at = new Date().toISOString();

    const { error } = await supabase
      .from("orders")
      .update(updateData)
      .eq("id", orderId);

    if (error) {
      toast.error("Failed to update order");
    } else {
      toast.success(
        newStatus === "preparing" ? "Order accepted!" : newStatus === "ready" ? "Order is ready!" : "Status updated"
      );
      fetchOrders();
    }
    setUpdating(null);
  };

  const handleDownload = (order: OrderWithItems) => {
    const blob = generateReceipt(order, currentCompany);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const label = order.payment_status === "paid" ? "receipt" : "bill";
    a.download = `${label}-order-${order.order_number}.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${order.payment_status === "paid" ? "Receipt" : "Bill"} downloaded!`);
  };

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const preparingOrders = orders.filter((o) => o.status === "preparing");
  const readyOrders = orders.filter((o) => o.status === "ready");

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const OrderCard = ({ order }: { order: OrderWithItems }) => {
    const StatusIcon = statusIcons[order.status] || Clock;
    const timeSince = Math.round((Date.now() - new Date(order.created_at).getTime()) / 60000);

    return (
      <Card className={`shadow-card border-2 ${statusColors[order.status] || ""}`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <StatusIcon className="h-4 w-4" />
              Order #{order.order_number}
            </CardTitle>
            <Badge variant="secondary" className="text-[10px]">
              {timeSince}m ago
            </Badge>
          </div>
          {order.table_number && (
            <p className="text-xs text-muted-foreground">Table {order.table_number}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            {order.order_items.map((oi) => (
              <div key={oi.id} className="flex items-start gap-2">
                <span className="text-xs font-bold bg-secondary rounded px-1.5 py-0.5 shrink-0">
                  ×{oi.quantity}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{oi.name}</p>
                  {oi.notes && <p className="text-[10px] text-muted-foreground">{oi.notes}</p>}
                </div>
              </div>
            ))}
          </div>

          {order.notes && (
            <div className="bg-warning/5 rounded-lg p-2 border border-warning/20">
              <p className="text-[10px] font-medium text-warning">Kitchen Notes:</p>
              <p className="text-xs text-muted-foreground">{order.notes}</p>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            {order.status === "pending" && (
              <Button
                size="sm"
                className="flex-1"
                onClick={() => updateOrderStatus(order.id, "preparing")}
                disabled={updating === order.id}
              >
                {updating === order.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ChefHat className="h-3 w-3 mr-1" />}
                Accept & Prepare
              </Button>
            )}
            {order.status === "preparing" && (
              <Button
                size="sm"
                className="flex-1 bg-success hover:bg-success/90"
                onClick={() => updateOrderStatus(order.id, "ready")}
                disabled={updating === order.id}
              >
                {updating === order.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Mark Ready
              </Button>
            )}
            {order.status === "ready" && (
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => updateOrderStatus(order.id, "served")}
                disabled={updating === order.id}
              >
                {updating === order.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                Mark Served
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleDownload(order)}
              className="text-xs"
            >
              <Download className="h-3 w-3 mr-1" />
              {order.payment_status === "paid" ? "Receipt" : "Bill"}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => printReceipt(order, currentCompany)}
              className="text-xs"
            >
              <Printer className="h-3 w-3 mr-1" />
              Print
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const activeItems = orders.reduce((sum, o) => sum + o.order_items.length, 0);

  return (
    <div className="pb-16">
      {bottomTab === "home" ? (
        <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
          <motion.div variants={itemVariant} className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold font-display">Kitchen Display</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {orders.length} active order{orders.length !== 1 ? "s" : ""} · Live updates
              </p>
            </div>
            <div className="flex gap-2">
              <Badge className="bg-warning/10 text-warning border-warning/30 border">{pendingOrders.length} pending</Badge>
              <Badge className="bg-primary/10 text-primary border-primary/30 border">{preparingOrders.length} cooking</Badge>
              <Badge className="bg-success/10 text-success border-success/30 border">{readyOrders.length} ready</Badge>
            </div>
          </motion.div>

          <motion.div variants={itemVariant} className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <StatCard title="Pending" value={pendingOrders.length} change="Waiting" changeType="neutral" icon={Clock} />
            <StatCard title="Preparing" value={preparingOrders.length} change="Cooking now" changeType="neutral" icon={Flame} />
            <StatCard title="Ready" value={readyOrders.length} change="To serve" changeType="positive" icon={Check} />
            <StatCard title="Completed Today" value={completedToday} change="Served" changeType="positive" icon={CheckCircle} />
            <StatCard title="Items Today" value={totalItemsToday} change={`${activeItems} active`} changeType="neutral" icon={ClipboardList} />
          </motion.div>

          {orders.length === 0 ? (
            <motion.div variants={itemVariant}>
              <Card className="shadow-card border-0">
                <CardContent className="text-center py-16">
                  <ChefHat className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
                  <h3 className="font-display font-semibold text-lg mb-1">No active orders</h3>
                  <p className="text-sm text-muted-foreground">Orders will appear here in real-time</p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div variants={itemVariant} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
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
