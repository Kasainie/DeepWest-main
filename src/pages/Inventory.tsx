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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { getLocalDateString, getLocalDayBoundsUTC } from "@/lib/dateUtils";
import { formatKES } from "@/lib/currency";
import { useAuth } from "@/contexts/AuthContext";
import { hasStaffAccess } from "@/lib/staffAccess";
import { Loader2, PackagePlus, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface ItemInventoryRow {
  key: string;
  menuItemId: string | null;
  balanceId: string | null;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editRow, setEditRow] = useState<ItemInventoryRow | null>(null);
  const [editQuantity, setEditQuantity] = useState("0");
  const [savingEdit, setSavingEdit] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<ItemInventoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<DateRange>({ from: new Date(), to: new Date() });
  const canManageInventory = ["owner", "admin", "manager"].includes(
    companyRole?.toLowerCase() || "",
  );
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
        .select("id, menu_item_id, item_name, quantity")
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
      const normalizedName = name.trim().toLowerCase();
      const existingByName = Array.from(rowsByItem.values()).find(
        (row) => row.name.trim().toLowerCase() === normalizedName,
      );
      const key = menuItemId || existingByName?.key || normalizedName;
      let row = menuItemId ? (rowsByItem.get(menuItemId) || existingByName) : rowsByItem.get(key);
      if (!row) {
        row = {
          key,
          menuItemId: menuItemId,
          balanceId: null,
          name,
          restockedQuantity: 0,
          stockQuantity: 0,
          soldQuantity: 0,
          revenue: 0,
        };
        rowsByItem.set(key, row);
      }
      if (!row.menuItemId && menuItemId) {
        row.menuItemId = menuItemId;
      }
      if (menuItemId && row.key !== menuItemId) {
        for (const [existingKey, existingRow] of rowsByItem.entries()) {
          if (existingRow === row) rowsByItem.delete(existingKey);
        }
        row.key = menuItemId;
        row.menuItemId = menuItemId;
        rowsByItem.set(menuItemId, row);
      }
      return row;
    };

    for (const menuItem of menuItemsRes.data || []) {
      getRow(menuItem.id, menuItem.name);
    }
    for (const balance of balancesRes.data || []) {
      const row = getRow(balance.menu_item_id, balance.item_name);
      row.balanceId = balance.id;
      row.stockQuantity = balance.quantity;
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

  const openEdit = (row: ItemInventoryRow) => {
    if (!canManageInventory || (!row.menuItemId && !row.balanceId)) return;
    setEditRow(row);
    setEditQuantity(String(row.stockQuantity));
    setEditOpen(true);
  };

  const handleEditStock = async () => {
    if (
      !currentCompany ||
      !editRow ||
      (!editRow.menuItemId && !editRow.balanceId) ||
      !canManageInventory
    ) return;
    const quantity = Number(editQuantity);
    if (!Number.isInteger(quantity) || quantity < 0) {
      toast.error("Enter a whole number of zero or more");
      return;
    }

    setSavingEdit(true);
    const result = editRow.balanceId
      ? await supabase
          .from("inventory_stock_balances")
          .update({ quantity, item_name: editRow.name })
          .eq("company_id", currentCompany.id)
          .eq("id", editRow.balanceId)
          .select("id")
          .maybeSingle()
      : await supabase
          .from("inventory_stock_balances")
          .insert({
            company_id: currentCompany.id,
            menu_item_id: editRow.menuItemId,
            item_name: editRow.name,
            quantity,
          })
          .select("id")
          .maybeSingle();

    if (result.error) {
      toast.error(`Could not update stock: ${result.error.message}`);
    } else if (!result.data) {
      toast.error("Stock balance was not found");
    } else {
      toast.success(`${editRow.name} stock updated`);
      setEditOpen(false);
      setEditRow(null);
      await fetchItemInventory();
    }
    setSavingEdit(false);
  };

  const handleDeleteItem = async () => {
    if (!currentCompany || !rowToDelete || !canManageInventory) return;
    setDeleting(true);
    if (rowToDelete.menuItemId) {
      const { data, error } = await supabase
        .from("menu_items")
        .delete()
        .eq("company_id", currentCompany.id)
        .eq("id", rowToDelete.menuItemId)
        .select("id")
        .maybeSingle();

      if (error) {
        toast.error(`Could not delete ${rowToDelete.name}: ${error.message}`);
      } else if (!data) {
        toast.error("Item was not deleted. You may not have permission.");
      } else {
        toast.success(`${rowToDelete.name} deleted from inventory`);
        setRowToDelete(null);
        await fetchItemInventory();
      }
    } else {
      if (!rowToDelete.balanceId) {
        toast.error("Inventory balance was not found");
        setDeleting(false);
        return;
      }

      const { error: restocksError } = await supabase
        .from("inventory_restock_entries")
        .delete()
        .eq("company_id", currentCompany.id)
        .is("menu_item_id", null)
        .eq("item_name", rowToDelete.name);

      if (restocksError) {
        toast.error(`Could not delete ${rowToDelete.name} restock records: ${restocksError.message}`);
        setDeleting(false);
        return;
      }

      const { data, error } = await supabase
        .from("inventory_stock_balances")
        .delete()
        .eq("company_id", currentCompany.id)
        .eq("id", rowToDelete.balanceId)
        .select("id")
        .maybeSingle();

      if (error) {
        toast.error(`Could not delete ${rowToDelete.name}: ${error.message}`);
      } else if (!data) {
        toast.error("Inventory item was not deleted. You may not have permission.");
      } else {
        toast.success(`${rowToDelete.name} inventory records deleted`);
        setRowToDelete(null);
        await fetchItemInventory();
      }
    }
    setDeleting(false);
  };

  const filteredInventoryRows = useMemo(
    () => inventoryRows.filter((row) =>
      row.name.toLowerCase().includes(searchQuery.trim().toLowerCase()),
    ),
    [inventoryRows, searchQuery],
  );

  const totals = useMemo(
    () => filteredInventoryRows.reduce(
      (sum, row) => ({
        restockedQuantity: sum.restockedQuantity + row.restockedQuantity,
        stockQuantity: sum.stockQuantity + row.stockQuantity,
        soldQuantity: sum.soldQuantity + row.soldQuantity,
        revenue: sum.revenue + row.revenue,
      }),
      { restockedQuantity: 0, stockQuantity: 0, soldQuantity: 0, revenue: 0 },
    ),
    [filteredInventoryRows],
  );

  const renderInventoryActions = (row: ItemInventoryRow) => {
    if (!canManageInventory || (!row.menuItemId && !row.balanceId)) return null;

    return (
      <div className="flex justify-end gap-1">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => openEdit(row)}
          aria-label={`Edit ${row.name} stock`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={() => setRowToDelete(row)}
          aria-label={`Delete ${row.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    );
  };

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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search inventory items..."
              className="pl-9"
              aria-label="Search inventory items"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredInventoryRows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {inventoryRows.length === 0
                ? "No stock, restocks, or paid sales in this period"
                : "No inventory items match your search"}
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
                    {canManageInventory && (
                      <TableHead className="hidden text-right md:table-cell">Actions</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventoryRows.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">
                        <div className="flex min-w-[220px] items-center justify-between gap-2">
                          <span>{row.name}</span>
                          <div className="md:hidden">{renderInventoryActions(row)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{row.restockedQuantity}</TableCell>
                      <TableCell className="text-right">{row.soldQuantity}</TableCell>
                      <TableCell className="text-right">{row.stockQuantity}</TableCell>
                      <TableCell className="text-right">{formatKES(row.revenue)}</TableCell>
                      {canManageInventory && (
                        <TableCell className="hidden text-right md:table-cell">
                          {renderInventoryActions(row)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                  <TableRow className="border-t-2 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right">{totals.restockedQuantity}</TableCell>
                    <TableCell className="text-right">{totals.soldQuantity}</TableCell>
                    <TableCell className="text-right">{totals.stockQuantity}</TableCell>
                    <TableCell className="text-right">{formatKES(totals.revenue)}</TableCell>
                    {canManageInventory && <TableCell className="hidden md:table-cell" />}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {editRow?.name} stock</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-stock-quantity">Available quantity</Label>
              <Input
                id="edit-stock-quantity"
                type="number"
                min="0"
                step="1"
                value={editQuantity}
                onChange={(event) => setEditQuantity(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleEditStock}
              disabled={savingEdit}
            >
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!rowToDelete} onOpenChange={(open) => !open && setRowToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {rowToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {rowToDelete?.menuItemId
                ? "This removes the menu item and its inventory records. Existing order history will be preserved."
                : "This removes the legacy stock balance and its restock records. Existing order history will be preserved."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteItem();
              }}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete item
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
