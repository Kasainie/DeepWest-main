import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Check, X } from "lucide-react";
import { KshIcon } from "@/components/KshIcon";
import { format } from "date-fns";
import { toast } from "sonner";

interface HistoryOrder {
  id: string;
  order_number: number;
  table_number: string | null;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  completed_at: string | null;
  served_by_name: string | null;
  order_items: { id: string; name: string; quantity: number }[];
}

const statusBadge: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  served: { variant: "default", label: "Served" },
  completed: { variant: "default", label: "Completed" },
  cancelled: { variant: "destructive", label: "Cancelled" },
  ready: { variant: "secondary", label: "Ready" },
};

export function OrderHistory() {
  const { currentCompany } = useCompany();
  const [orders, setOrders] = useState<HistoryOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompany) return;
    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, table_number, status, payment_status, total, created_at, completed_at, served_by_name, order_items(id, name, quantity)")
        .eq("company_id", currentCompany.id)
        .in("status", ["served", "completed", "cancelled"])
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) {
        toast.error(`Failed to load order history: ${error.message}`);
        setOrders([]);
        setLoading(false);
        return;
      }
      setOrders((data || []) as HistoryOrder[]);
      setLoading(false);
    };
    fetchHistory();
  }, [currentCompany?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-16">
          <Clock className="h-14 w-14 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-display font-semibold text-lg mb-1">No order history</h3>
          <p className="text-sm text-muted-foreground">Completed orders will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold font-display">Order History</h2>
      <p className="text-sm text-muted-foreground">Last 50 completed orders</p>
      <div className="space-y-2">
        {orders.map((order) => {
          const badge = statusBadge[order.status] || { variant: "outline" as const, label: order.status };
          return (
            <Card key={order.id} className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">#{order.order_number}</span>
                    {order.table_number && (
                      <span className="text-xs text-muted-foreground">Table {order.table_number}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={badge.variant} className="text-[10px]">{badge.label}</Badge>
                    <Badge variant={order.payment_status === "paid" ? "default" : "outline"} className="text-[10px]">
                      {order.payment_status}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {order.order_items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}
                  </div>
                  <span className="text-sm font-semibold">KSh {order.total.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(order.created_at), "MMM d, yyyy · h:mm a")}
                  {order.status === "served" && (
                    <> · Served by {order.served_by_name || "Not recorded"}</>
                  )}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
