import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, Check, Download, Clock, Printer } from "lucide-react";
import { toast } from "sonner";
import { generateReceipt, printReceipt } from "@/lib/receipt";

interface OrderWithItems {
  id: string;
  order_number: number;
  table_number: string | null;
  status: string;
  payment_status: string;
  payment_method: string | null;
  subtotal: number;
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
  }[];
}

const statusBadge: Record<string, string> = {
  pending: "bg-warning/10 text-warning",
  preparing: "bg-primary/10 text-primary",
  ready: "bg-success/10 text-success",
  served: "bg-accent/10 text-accent",
};

export function OrdersList({ mode = "restaurant" }: { mode?: "restaurant" | "waiter" }) {
  const { currentCompany, staffRole } = useCompany();
  const isWaiter = mode === "waiter" || staffRole?.toLowerCase() === "waiter";
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [serving, setServing] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompany) {
      fetchOrders();
      const channel = supabase
        .channel("restaurant-orders")
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
          fetchOrders();
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    }
  }, [currentCompany?.id, mode]);

  const fetchOrders = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const query = supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("company_id", currentCompany.id);
    const { data } = isWaiter
      ? await query.in("status", ["pending", "preparing", "ready"]).order("created_at", { ascending: false }).limit(50)
      : await query.neq("status", "cancelled").order("created_at", { ascending: false }).limit(50);

    setOrders((data || []) as OrderWithItems[]);
    setLoading(false);
  };

  const handleMarkServed = async (orderId: string) => {
    setServing(orderId);
    const { data, error } = await supabase
      .from("orders")
      .update({ status: "served", completed_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "ready")
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error("Failed to mark order as served");
    } else if (!data) {
      toast.error("This order is no longer ready to serve");
    } else {
      toast.success("Order marked as served");
      fetchOrders();
    }
    setServing(null);
  };

  const handlePayment = async (orderId: string, method: string) => {
    setPaying(orderId);
    const { error } = await supabase
      .from("orders")
      .update({
        payment_status: "paid",
        payment_method: method,
        paid_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", orderId);

    if (error) {
      toast.error("Payment failed");
    } else {
      toast.success("Payment recorded!");
      fetchOrders();
    }
    setPaying(null);
  };

  const handleDownloadReceipt = (order: OrderWithItems) => {
    const blob = generateReceipt(order, currentCompany);
    const url = URL.createObjectURL(blob);
    const filename = `receipt-order-${order.order_number}.html`;

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    link.style.display = "none";
    document.body.appendChild(link);

    try {
      link.click();
      toast.success("Receipt download started");
    } catch {
      toast.error("Download blocked by browser. Please allow downloads and try again.");
    } finally {
      setTimeout(() => {
        URL.revokeObjectURL(url);
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      }, 1000);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="shadow-card border-0">
        <CardContent className="text-center py-12">
          <Clock className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">
            {isWaiter ? "No kitchen orders waiting right now" : "No orders yet"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {isWaiter && <h2 className="text-xl font-bold font-display">Kitchen Orders</h2>}
      {orders.map((order) => (
        <Card key={order.id} className="shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold font-display">Order #{order.order_number}</p>
                  <Badge className={`${statusBadge[order.status] || "bg-muted text-muted-foreground"} text-[10px] border-0 capitalize`}>
                    {order.status}
                  </Badge>
                  {!isWaiter && (
                    <Badge variant={order.payment_status === "paid" ? "default" : "secondary"} className="text-[10px]">
                      {order.payment_status === "paid" ? "✓ Paid" : "Unpaid"}
                    </Badge>
                  )}
                </div>
                {order.table_number && (
                  <p className="text-xs text-muted-foreground mt-0.5">Table {order.table_number}</p>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="space-y-1 mb-3">
              {order.order_items.map((oi) => (
                <div key={oi.id} className="flex justify-between text-xs">
                  <span>
                    <span className="font-medium">×{oi.quantity}</span> {oi.name}
                  </span>
                  <span className="text-muted-foreground">KSh {Number(oi.total_price).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t pt-1 mt-1 flex justify-between text-xs">
                <span className="text-muted-foreground">Subtotal</span>
                <span>KSh {Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span>KSh {Number(order.total).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {isWaiter ? (
                order.status === "ready" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleMarkServed(order.id)}
                    disabled={serving === order.id}
                    className="text-xs"
                  >
                    {serving === order.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
                    Mark Served
                  </Button>
                )
              ) : (
                <>
                  {order.payment_status !== "paid" && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handlePayment(order.id, "cash")}
                        disabled={paying === order.id}
                        className="text-xs"
                      >
                        {paying === order.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CreditCard className="h-3 w-3 mr-1" />}
                        Pay Cash
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePayment(order.id, "card")}
                        disabled={paying === order.id}
                        className="text-xs"
                      >
                        Pay Card
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePayment(order.id, "mobile")}
                        disabled={paying === order.id}
                        className="text-xs"
                      >
                        Mobile Pay
                      </Button>
                    </>
                  )}
                  {order.payment_status === "paid" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadReceipt(order)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Receipt
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
                    </>
                  )}
                  {order.payment_status !== "paid" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownloadReceipt(order)}
                        className="text-xs"
                      >
                        <Download className="h-3 w-3 mr-1" />
                        Download Bill
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => printReceipt(order, currentCompany)}
                        className="text-xs"
                      >
                        <Printer className="h-3 w-3 mr-1" />
                        Print Bill
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
