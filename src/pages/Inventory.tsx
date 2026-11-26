import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { getLocalDateString, getLocalDayBoundsUTC } from "@/lib/dateUtils";
import { formatKES } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { hasStaffAccess } from "@/lib/staffAccess";
import { Loader2, PackagePlus } from "lucide-react";
import { toast } from "sonner";

interface ItemInventoryRow {
  key: string;
  name: string;
  restockedQuantity: number;
  stockQuantity: number;
  soldQuantity: number;
  revenue: number;
}

interface MenuItemOption {
  id: string;
  name: string;
}

export default function Inventory() {
  const { currentCompany, companyRole, staffDepartment, staffPermissions } = useCompany();
  const { user } = useAuth();
  const [inventoryRows, setInventoryRows] = useState<ItemInventoryRow[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [restockOpen, setRestockOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState("");
  const [restockQuantity, setRestockQuantity] = useState("1");
  const [restocking, setRestocking] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });
  const canRestock = hasStaffAccess(
    companyRole,
    staffDepartment,
    staffPermissions,
    "kitchen.inventory",
  );

  const fetchItemInventory = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { start } = getLocalDayBoundsUTC(dateRange.from);
    const { end } = getLocalDayBoundsUTC(dateRange.to);
    const fromDate = getLocalDateString(dateRange.from);
    const toDate = getLocalDateString(dateRange.to);
    const itemFields = "order_items(id, menu_item_id, name, quantity, total_price)";
    const [restocksRes, balancesRes, paidOrdersRes, menuItemsRes] = await Promise.all([
      supabase
        .from("inventory_restock_entries")
        .select("menu_item_id, item_name, quantity")
        .eq("company_id", currentCompany.id)
        .gte("stock_date", fromDate)
        .lte("stock_date", toDate),
      supabase
        .from("inventory_stock_balances")
        .select("menu_item_id, item_name, quantity")
        .eq("company_id", currentCompany.id),
      supabase
        .from("orders")
        .select(`paid_at, ${itemFields}`)
        .eq("company_id", currentCompany.id)
        .eq("payment_status", "paid")
        .gte("paid_at", start)
        .lte("paid_at", end),
      supabase
        .from("menu_items")
        .select("id, name")
        .eq("company_id", currentCompany.id)
        .eq("is_available", true)
        .order("name"),
    ]);

    if (restocksRes.error || balancesRes.error || paidOrdersRes.error || menuItemsRes.error) {
      toast.error(
        restocksRes.error?.message ||
        balancesRes.error?.message ||
        paidOrdersRes.error?.message ||
        menuItemsRes.error?.message ||
        "Failed to load item inventory",
      );
      setLoading(false);
      return;
    }

    const rowsByItem = new Map<string, ItemInventoryRow>();
    const getRow = (menuItemId: string | null, name: string) => {
      const key = menuItemId || name.trim().toLowerCase();
      let row = rowsByItem.get(key);
      if (!row) {
        row = {
          key,
          name,
          restockedQuantity: 0,
          stockQuantity: 0,
          soldQuantity: 0,
          revenue: 0,
        };
        rowsByItem.set(key, row);
      }
      return row;
    };

    for (const menuItem of menuItemsRes.data || []) {
      getRow(menuItem.id, menuItem.name);
    }
    for (const balance of balancesRes.data || []) {
      getRow(balance.menu_item_id, balance.item_name).stockQuantity = balance.quantity;
    }
    for (const restock of restocksRes.data || []) {
      getRow(restock.menu_item_id, restock.item_name).restockedQuantity += restock.quantity;
    }
    for (const order of paidOrdersRes.data || []) {
      for (const orderItem of order.order_items) {
        const row = getRow(orderItem.menu_item_id, orderItem.name);
        row.soldQuantity += orderItem.quantity;
        row.revenue += Number(orderItem.total_price);
      }
    }

    setMenuItems(menuItemsRes.data || []);
    setInventoryRows(
      Array.from(rowsByItem.values()).sort((a, b) => a.name.localeCompare(b.name)),
    );
    setLoading(false);
  }, [currentCompany, dateRange]);

  useEffect(() => {
    if (currentCompany) fetchItemInventory();
  }, [currentCompany, fetchItemInventory]);

  const handleRestock = async () => {
    if (!currentCompany || !user || !canRestock) return;
    const quantity = Number(restockQuantity);
    const menuItem = menuItems.find((item) => item.id === selectedMenuItemId);
    if (!menuItem) {
      toast.error("Choose an item to restock");
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      toast.error("Enter a whole number greater than zero");
      return;
    }

    setRestocking(true);
    const { error } = await supabase.from("inventory_restock_entries").insert({
      company_id: currentCompany.id,
      menu_item_id: menuItem.id,
      item_name: menuItem.name,
      quantity,
      stock_date: getLocalDateString(),
      restocked_by: user.id,
    });

    if (error) {
      toast.error(`Could not restock ${menuItem.name}: ${error.message}`);
    } else {
      toast.success(`${quantity} ${menuItem.name} added to stock`);
      setRestockOpen(false);
      setSelectedMenuItemId("");
      setRestockQuantity("1");
      await fetchItemInventory();
    }
    setRestocking(false);
  };

  const totals = useMemo(
    () => inventoryRows.reduce(
      (sum, row) => ({
        restockedQuantity: sum.restockedQuantity + row.restockedQuantity,
        stockQuantity: sum.stockQuantity + row.stockQuantity,
        soldQuantity: sum.soldQuantity + row.soldQuantity,
        revenue: sum.revenue + row.revenue,
      }),
      { restockedQuantity: 0, stockQuantity: 0, soldQuantity: 0, revenue: 0 },
    ),
    [inventoryRows],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Inventory</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current stock carries forward; restocks, paid sales, and revenue are shown for the selected period
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
          {canRestock && (
            <Button onClick={() => setRestockOpen(true)}>
              <PackagePlus className="mr-2 h-4 w-4" />
              Restock
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-card border-0">
        <CardHeader>
          <CardTitle className="text-base font-display">Stock & Sales by Item</CardTitle>
          <p className="text-sm text-muted-foreground">
            Available stock carries forward and is reserved when an order is placed. Add the opening quantity after accounting for existing open orders; new orders are blocked when stock is insufficient.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : inventoryRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No stock, restocks, or paid sales in this period
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Restocked</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Available now</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inventoryRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell className="text-right">{row.restockedQuantity}</TableCell>
                      <TableCell className="text-right">{row.soldQuantity}</TableCell>
                      <TableCell className="text-right">{row.stockQuantity}</TableCell>
                      <TableCell className="text-right">{formatKES(row.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totals.restockedQuantity}</TableCell>
                    <TableCell className="text-right">{totals.soldQuantity}</TableCell>
                    <TableCell className="text-right">{totals.stockQuantity}</TableCell>
                    <TableCell className="text-right">{formatKES(totals.revenue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={restockOpen} onOpenChange={setRestockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restock an item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Add the starting quantity or replenish an item. Any available stock carries forward.
            </p>
            <div className="space-y-2">
              <Label htmlFor="restock-item">Menu item</Label>
              <Select value={selectedMenuItemId} onValueChange={setSelectedMenuItemId}>
                <SelectTrigger id="restock-item">
                  <SelectValue placeholder="Choose an item" />
                </SelectTrigger>
                <SelectContent>
                  {menuItems.map((menuItem) => (
                    <SelectItem key={menuItem.id} value={menuItem.id}>
                      {menuItem.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {menuItems.length === 0 && (
                <p className="text-xs text-muted-foreground">No available menu items to restock.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restock-quantity">Quantity to add</Label>
              <Input
                id="restock-quantity"
                type="number"
                min="1"
                step="1"
                value={restockQuantity}
                onChange={(event) => setRestockQuantity(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleRestock}
              disabled={restocking || menuItems.length === 0}
            >
              {restocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add to stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
