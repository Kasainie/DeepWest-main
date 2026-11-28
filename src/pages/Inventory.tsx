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
  initialQuantity: number;
  actualRestockedQuantity: number;
  restockedQuantity: number;
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
  const [editInitialQuantity, setEditInitialQuantity] = useState("0");
  const [editRestockedQuantity, setEditRestockedQuantity] = useState("0");
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
    const [restocksRes, balancesRes, paidOrdersRes, menuItemsRes, adjustmentsRes] = await Promise.all([
      supabase
        .from("inventory_restock_entries")
        .select("menu_item_id, item_name, quantity")
        .eq("company_id", currentCompany.id)
        .gte("stock_date", fromDate)
        .lte("stock_date", toDate),
      supabase
        .from("inventory_stock_balances")
        .select("id, menu_item_id, item_name, initial_quantity")
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
      supabase
        .from("inventory_period_adjustments")
        .select("item_key, initial_quantity, restocked_adjustment")
        .eq("company_id", currentCompany.id)
        .eq("period_start", fromDate)
        .eq("period_end", toDate),
    ]);

    if (
      restocksRes.error ||
      balancesRes.error ||
      paidOrdersRes.error ||
      menuItemsRes.error ||
      adjustmentsRes.error
    ) {
      toast.error(
        restocksRes.error?.message ||
        balancesRes.error?.message ||
        paidOrdersRes.error?.message ||
        menuItemsRes.error?.message ||
        adjustmentsRes.error?.message ||
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
          initialQuantity: 0,
          actualRestockedQuantity: 0,
          restockedQuantity: 0,
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
      row.initialQuantity = balance.initial_quantity;
    }
    for (const restock of restocksRes.data || []) {
      getRow(restock.menu_item_id, restock.item_name).actualRestockedQuantity += restock.quantity;
    }
    for (const order of paidOrdersRes.data || []) {
      for (const orderItem of order.order_items) {
        const row = getRow(orderItem.menu_item_id, orderItem.name);
        row.soldQuantity += orderItem.quantity;
        row.revenue += Number(orderItem.total_price);
      }
    }
    for (const row of rowsByItem.values()) {
      row.restockedQuantity = row.actualRestockedQuantity;
    }
    for (const adjustment of adjustmentsRes.data || []) {
      const row = Array.from(rowsByItem.values()).find((item) =>
        (item.menuItemId
          ? `menu:${item.menuItemId}`
          : `legacy:${item.name.trim().toLowerCase()}`) === adjustment.item_key,
      );
      if (!row) continue;
      row.initialQuantity = adjustment.initial_quantity;
      row.restockedQuantity += adjustment.restocked_adjustment;
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
    setEditInitialQuantity(String(row.initialQuantity));
    setEditRestockedQuantity(String(row.restockedQuantity));
    setEditOpen(true);
  };

  const handleEditStock = async () => {
    if (
      !currentCompany ||
      !editRow ||
      !canManageInventory
    ) return;
    const initialQuantity = Number(editInitialQuantity);
    if (!Number.isInteger(initialQuantity) || initialQuantity < 0) {
      toast.error("Enter a whole number of zero or more for initial quantity");
      return;
    }
    const restockedQuantity = Number(editRestockedQuantity);
    if (!Number.isInteger(restockedQuantity) || restockedQuantity < 0) {
      toast.error("Enter a whole number of zero or more for restocked quantity");
      return;
    }

    setSavingEdit(true);
    const { error } = await supabase
      .from("inventory_period_adjustments")
      .upsert(
        {
          company_id: currentCompany.id,
          item_key: editRow.menuItemId
            ? `menu:${editRow.menuItemId}`
            : `legacy:${editRow.name.trim().toLowerCase()}`,
          item_name: editRow.name,
          period_start: getLocalDateString(dateRange.from),
          period_end: getLocalDateString(dateRange.to),
          initial_quantity: initialQuantity,
          restocked_adjustment: restockedQuantity - editRow.actualRestockedQuantity,
        },
        { onConflict: "company_id,item_key,period_start,period_end" },
      );

    if (error) {
      toast.error(`Could not update inventory period: ${error.message}`);
    } else {
      toast.success(`${editRow.name} period quantities updated`);
      setEditOpen(false);
      setEditRow(null);
      await fetchItemInventory();
    }
    setSavingEdit(false);
  };

  const handleDeleteItem = async () => {
    if (!currentCompany || !rowToDelete || !canManageInventory) return;
    setDeleting(true);
    const itemKey = rowToDelete.menuItemId
      ? `menu:${rowToDelete.menuItemId}`
      : `legacy:${rowToDelete.name.trim().toLowerCase()}`;
    const { error: adjustmentsError } = await supabase
      .from("inventory_period_adjustments")
      .delete()
      .eq("company_id", currentCompany.id)
      .eq("item_key", itemKey);

    if (adjustmentsError) {
      toast.error(`Could not remove ${rowToDelete.name} period adjustments: ${adjustmentsError.message}`);
      setDeleting(false);
      return;
    }

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
        initialQuantity: sum.initialQuantity + row.initialQuantity,
        restockedQuantity: sum.restockedQuantity + row.restockedQuantity,
        soldQuantity: sum.soldQuantity + row.soldQuantity,
        revenue: sum.revenue + row.revenue,
      }),
      { initialQuantity: 0, restockedQuantity: 0, soldQuantity: 0, revenue: 0 },
    ),
    [filteredInventoryRows],
  );
  const totalAvailableQuantity =
    totals.initialQuantity + totals.restockedQuantity - totals.soldQuantity;

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
            Edit the opening and restocked quantities for this period. Sold is calculated from paid orders; available is the period closing balance.
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
            Available for the selected period is calculated as Initial + Restocked − Sold. These report values do not change live stock used by orders.
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
                    <TableHead className="text-right">Initial</TableHead>
                    <TableHead className="text-right">Restocked (period)</TableHead>
                    <TableHead className="text-right">Sold</TableHead>
                    <TableHead className="text-right">Available (period close)</TableHead>
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
                      <TableCell className="text-right">{row.initialQuantity}</TableCell>
                      <TableCell className="text-right">{row.restockedQuantity}</TableCell>
                      <TableCell className="text-right">{row.soldQuantity}</TableCell>
                      <TableCell className="text-right">
                        {row.initialQuantity + row.restockedQuantity - row.soldQuantity}
                      </TableCell>
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
                    <TableCell className="text-right">{totals.initialQuantity}</TableCell>
                    <TableCell className="text-right">{totals.restockedQuantity}</TableCell>
                    <TableCell className="text-right">{totals.soldQuantity}</TableCell>
                    <TableCell className="text-right">{totalAvailableQuantity}</TableCell>
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
            <DialogTitle>Edit {editRow?.name} period quantities</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These values update the selected-period report only. Available is calculated automatically from initial, restocked, and sold quantities.
            </p>
            <div className="space-y-2">
              <Label htmlFor="edit-stock-initial-quantity">Initial quantity</Label>
              <Input
                id="edit-stock-initial-quantity"
                type="number"
                min="0"
                step="1"
                value={editInitialQuantity}
                onChange={(event) => setEditInitialQuantity(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-stock-restocked-quantity">Restocked quantity for this period</Label>
              <Input
                id="edit-stock-restocked-quantity"
                type="number"
                min="0"
                step="1"
                value={editRestockedQuantity}
                onChange={(event) => setEditRestockedQuantity(event.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleEditStock}
              disabled={savingEdit}
            >
              {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save quantities
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
              The quantity entered is added to the item's available stock; it does not replace it.
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
