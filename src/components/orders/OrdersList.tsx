import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CreditCard, Check, Download, Clock, Printer, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { generateReceipt, printReceipt } from "@/lib/receipt";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export function OrdersList({
  mode = "restaurant",
  onOrderDeleted,
  onKitchenOrdersCountChange,
}: {
  mode?: "restaurant" | "waiter";
  onOrderDeleted?: () => void;
  onKitchenOrdersCountChange?: (count: number) => void;
}) {
  const { currentCompany, companyRole, staffRole } = useCompany();
  const isWaiter = mode === "waiter" || staffRole?.toLowerCase() === "waiter";
  const canDeleteOrders = !isWaiter && (companyRole === "owner" || companyRole === "admin");
  const [orders, setOrders] = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [serving, setServing] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<OrderWithItems | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<"all" | "unpaid" | "paid">("all");

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
    const ordersRequest = isWaiter
      ? query.in("status", ["pending", "preparing", "ready"]).order("created_at", { ascending: false }).limit(50)
      : query.neq("status", "cancelled").order("created_at", { ascending: false }).limit(50);
    const kitchenOrdersCountRequest = onKitchenOrdersCountChange
      ? supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("company_id", currentCompany.id)
          .in("status", ["pending", "preparing", "ready"])
      : Promise.resolve({ count: null, error: null });
    const [{ data }, { count, error: countError }] = await Promise.all([
      ordersRequest,
      kitchenOrdersCountRequest,
    ]);

    setOrders((data || []) as OrderWithItems[]);
    if (countError) {
      toast.error("Failed to load the number of active kitchen orders");
    } else if (count !== null) {
      onKitchenOrdersCountChange?.(count);
    }
    setLoading(false);
  };

  const unpaidOrders = orders.filter((order) => order.payment_status !== "paid");
  const paidOrders = orders.filter((order) => order.payment_status === "paid");
  const ordersToDisplay = isWaiter
    ? orders
    : paymentFilter === "unpaid"
      ? unpaidOrders
      : paymentFilter === "paid"
        ? paidOrders
        : [...unpaidOrders, ...paidOrders];

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
      toast.error(error.message || "Failed to mark order as served");
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

  const handleDeleteOrder = async () => {
    if (!currentCompany || !orderToDelete || !canDeleteOrders) return;
    setDeletingOrderId(orderToDelete.id);
    const { data, error } = await supabase
      .from("orders")
      .delete()
      .eq("id", orderToDelete.id)
      .eq("company_id", currentCompany.id)
      .select("id")
      .maybeSingle();

    if (error) {
      toast.error(`Failed to delete order: ${error.message}`);
    } else if (!data) {
      toast.error("Order was not deleted. It may have already been removed or you may not have permission.");
    } else {
      setOrders((prev) => prev.filter((order) => order.id !== orderToDelete.id));
      toast.success(`Order #${orderToDelete.order_number} deleted`);
      setOrderToDelete(null);
      onOrderDeleted?.();
    }
    setDeletingOrderId(null);
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
    <div className="space-y-4">
      {!isWaiter && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold font-display">Active Orders</h2>
            <p className="text-xs text-muted-foreground">Unpaid orders are grouped first</p>
          </div>
          <div
            role="group"
            aria-label="Filter active orders by payment status"
            className="flex w-full gap-1 rounded-lg bg-muted p-1 sm:w-auto"
          >
            {([
              { value: "all", label: "All", count: orders.length },
              { value: "unpaid", label: "Unpaid", count: unpaidOrders.length },
              { value: "paid", label: "Paid", count: paidOrders.length },
            ] as const).map((filter) => (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={paymentFilter === filter.value ? "default" : "ghost"}
                aria-pressed={paymentFilter === filter.value}
                onClick={() => setPaymentFilter(filter.value)}
                className="flex-1 gap-1.5 sm:flex-none"
              >
                {filter.label}
                <span
                  className={`rounded-full px-1.5 text-[10px] ${
                    paymentFilter === filter.value
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-background text-muted-foreground"
                  }`}
                >
                  {filter.count}
                </span>
              </Button>
            ))}
          </div>
        </div>
      )}
      {isWaiter && <h2 className="text-xl font-bold font-display">Kitchen Orders</h2>}
      {ordersToDisplay.length === 0 ? (
        <Card className="shadow-card border-0">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {paymentFilter === "unpaid" ? "No unpaid orders" : "No paid orders"}
            </p>
          </CardContent>
        </Card>
      ) : (
      <div className="space-y-3">
      {ordersToDisplay.map((order, index) => {
        const isPaid = order.payment_status === "paid";
        const previousOrder = ordersToDisplay[index - 1];
        const isNewPaymentGroup = !isWaiter && (
          index === 0 || (previousOrder.payment_status === "paid") !== isPaid
        );
        const groupCount = isPaid ? paidOrders.length : unpaidOrders.length;

        return (
        <div key={order.id} className="space-y-3">
        {isNewPaymentGroup && (
          <div className="flex items-center gap-2 px-1 pt-2">
            <span className={`h-2 w-2 rounded-full ${isPaid ? "bg-success" : "bg-destructive"}`} />
            <h3 className={`text-sm font-semibold ${isPaid ? "text-foreground" : "text-destructive"}`}>
              {isPaid ? "Paid orders" : "Unpaid orders"}
            </h3>
            <Badge variant={isPaid ? "secondary" : "destructive"} className="text-[10px]">
              {groupCount}
            </Badge>
          </div>
        )}
        <Card className="shadow-card border-0">
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
                    variant="default"
                    onClick={() => handleMarkServed(order.id)}
                    disabled={serving === order.id}
                    className="min-w-32 bg-success font-semibold text-success-foreground shadow-sm hover:bg-success/90"
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
                        onClick={() => handlePayment(order.id, "mobile")}
                        disabled={paying === order.id}
                        className="text-xs"
                      >
                        Pay Till
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
              {canDeleteOrders && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setOrderToDelete(order)}
                  disabled={deletingOrderId === order.id}
                  className="text-xs text-destructive hover:text-destructive"
                  aria-label={`Delete order ${order.order_number}`}
                >
                  {deletingOrderId === order.id ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3 mr-1" />
                  )}
                  Delete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
        </div>
        );
      })}
      </div>
      )}
      <AlertDialog
        open={orderToDelete !== null}
        onOpenChange={(open) => {
          if (!open && deletingOrderId === null) setOrderToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete Order #{orderToDelete?.order_number}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the order and its items, and removes its sales-ledger entry.
              {orderToDelete?.payment_status === "paid" && " It will not refund or reverse the payment."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingOrderId !== null}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteOrder}
              disabled={deletingOrderId !== null}
            >
              {deletingOrderId !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete order
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
