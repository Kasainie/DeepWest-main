import { useState, useEffect } from "react";
import { subDays, format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { DateRangeFilter, DateRange } from "@/components/DateRangeFilter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Loader2, CalendarDays, CheckCircle, XCircle, LogOut, Printer } from "lucide-react";
import { toast } from "sonner";
import { printBookingReceipt, BookingReceiptData } from "@/lib/bookingReceipt";
import { motion } from "framer-motion";

import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";

interface Booking {
  id: string;
  booking_type: string;
  details: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  amount: number;
  created_at: string;
  guests: { full_name: string } | null;
  room_id: string | null;
  rooms: { room_number: string } | null;
}

interface AvailableRoom {
  id: string;
  room_number: string;
  type: string;
  price_per_night: number;
  status: string;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  confirmed: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
  checked_out: "bg-muted text-muted-foreground",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Bookings() {
  const { currentCompany } = useCompany();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [guests, setGuests] = useState<{ id: string; full_name: string }[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    guest_id: "",
    room_id: "",
    booking_type: "room",
    details: "",
    check_in: "",
    check_out: "",
    status: "confirmed",
    amount: "",
  });

  const [dateRange, setDateRange] = useState<DateRange>({ from: subDays(new Date(), 29), to: new Date() });

  useEffect(() => {
    if (currentCompany) fetchData();
  }, [currentCompany?.id, dateRange]);

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const fromDate = format(dateRange.from, "yyyy-MM-dd");
    const toDate = format(dateRange.to, "yyyy-MM-dd");
    const [bRes, gRes, rRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, guests(full_name), rooms(room_number)")
        .eq("company_id", currentCompany.id)
        .gte("created_at", fromDate + "T00:00:00")
        .lte("created_at", toDate + "T23:59:59")
        .order("created_at", { ascending: false }),
      supabase
        .from("guests")
        .select("id, full_name")
        .eq("company_id", currentCompany.id)
        .order("full_name"),
      supabase
        .from("rooms")
        .select("id, room_number, type, price_per_night, status")
        .eq("company_id", currentCompany.id)
        .eq("status", "available")
        .order("room_number"),
    ]);
    setBookings((bRes.data || []) as unknown as Booking[]);
    setGuests(gRes.data || []);
    setAvailableRooms((rRes.data || []) as AvailableRoom[]);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { error } = await supabase.from("bookings").insert({
      company_id: currentCompany.id,
      guest_id: form.guest_id || null,
      room_id: form.room_id || null,
      booking_type: form.booking_type,
      details: form.details || null,
      check_in: form.check_in || null,
      check_out: form.check_out || null,
      status: form.status,
      amount: parseFloat(form.amount) || 0,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Booking created!");
      setForm({ guest_id: "", room_id: "", booking_type: "room", details: "", check_in: "", check_out: "", status: "confirmed", amount: "" });
      setAddOpen(false);
      fetchData();
    }
    setSaving(false);
  };

  const handleCheckout = async (booking: Booking) => {
    const today = format(new Date(), "yyyy-MM-dd");
    const checkOutDate = booking.check_out || today;
    await supabase.from("bookings").update({ status: "checked_out", check_out: checkOutDate }).eq("id", booking.id);
    if (booking.room_id) {
      await supabase.from("rooms").update({ status: "available" }).eq("id", booking.room_id);
    }
    toast.success("Guest checked out successfully");
    // Print checkout receipt
    const receiptData: BookingReceiptData = {
      guest_name: booking.guests?.full_name || "Guest",
      room_number: booking.rooms?.room_number || undefined,
      booking_type: booking.booking_type,
      details: booking.details || undefined,
      check_in: booking.check_in || undefined,
      check_out: checkOutDate,
      amount: booking.amount,
      status: "checked_out",
      created_at: booking.created_at,
    };
    printBookingReceipt(receiptData, currentCompany, "check_out");
    fetchData();
  };

  const handlePrintReceipt = (booking: Booking, type: "check_in" | "check_out") => {
    const receiptData: BookingReceiptData = {
      guest_name: booking.guests?.full_name || "Guest",
      room_number: booking.rooms?.room_number || undefined,
      booking_type: booking.booking_type,
      details: booking.details || undefined,
      check_in: booking.check_in || undefined,
      check_out: booking.check_out || undefined,
      amount: booking.amount,
      status: booking.status,
      created_at: booking.created_at,
    };
    printBookingReceipt(receiptData, currentCompany, type);
  };

  const filtered = bookings.filter((b) => {
    const guestName = b.guests?.full_name || "";
    const q = search.toLowerCase();
    return guestName.toLowerCase().includes(q) || b.booking_type.toLowerCase().includes(q) || b.status.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => ["confirmed", "active"].includes(b.status)).length;
  const cancelledBookings = bookings.filter((b) => b.status === "cancelled").length;
  const totalRevenue = bookings.filter((b) => b.status !== "cancelled").reduce((s, b) => s + Number(b.amount), 0);

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">All Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">{bookings.length} booking{bookings.length !== 1 ? "s" : ""} total</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Booking</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Create Booking</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Guest</Label>
                <Select value={form.guest_id} onValueChange={(v) => setForm((f) => ({ ...f, guest_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select guest" /></SelectTrigger>
                  <SelectContent>
                    {guests.map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={form.booking_type} onValueChange={(v) => setForm((f) => ({ ...f, booking_type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="room">Room</SelectItem>
                      <SelectItem value="restaurant">Restaurant</SelectItem>
                      <SelectItem value="conference">Conference</SelectItem>
                      <SelectItem value="bar">Bar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {form.booking_type === "room" && (
                <div className="space-y-2">
                  <Label>Room</Label>
                  <Select value={form.room_id} onValueChange={(v) => {
                    const room = availableRooms.find(r => r.id === v);
                    setForm((f) => ({ ...f, room_id: v, details: room ? `Room ${room.room_number} · ${room.type}` : f.details }));
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select available room" /></SelectTrigger>
                    <SelectContent>
                      {availableRooms.length === 0 ? (
                        <SelectItem value="none" disabled>No available rooms</SelectItem>
                      ) : (
                        availableRooms.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            Room {r.room_number} · {r.type} · KSh {Number(r.price_per_night).toLocaleString()}/night
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Details</Label>
                <Input value={form.details} onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))} placeholder="Suite #101 · 3 nights" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Check In</Label>
                  <Input type="date" value={form.check_in} onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Check Out</Label>
                  <Input type="date" value={form.check_out} onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Amount ($)</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Booking
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={item} className="flex items-center justify-end">
        <DateRangeFilter dateRange={dateRange} onDateRangeChange={setDateRange} />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Total Bookings" value={bookings.length} icon={CalendarDays} />
        <StatCard title="Active" value={activeBookings} change="Confirmed" changeType="positive" icon={CheckCircle} />
        <StatCard title="Cancelled" value={cancelledBookings} changeType={cancelledBookings > 0 ? "negative" : "neutral"} icon={XCircle} />
        <StatCard title="Revenue" value={`KSh ${totalRevenue.toLocaleString()}`} change="All bookings" changeType="neutral" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
      </motion.div>

      <motion.div variants={item} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bookings..." className="pl-9 bg-card border-0 shadow-soft" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardContent className="text-center py-12">
              <CalendarDays className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold mb-1">{bookings.length === 0 ? "No bookings yet" : "No matching bookings"}</h3>
              <p className="text-sm text-muted-foreground">{bookings.length === 0 ? "Create your first booking to get started" : "Try a different search term"}</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item}>
          <Card className="shadow-card border-0 overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-secondary/30">
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Guest</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Details</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Dates</th>
                      <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Amount</th>
                      <th className="text-right text-xs font-medium text-muted-foreground p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((b) => (
                      <tr key={b.id} className="border-b last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="p-3">
                          <p className="text-sm font-medium">{b.guests?.full_name || "—"}</p>
                        </td>
                        <td className="p-3"><Badge variant="secondary" className="text-[10px] capitalize">{b.booking_type}</Badge></td>
                        <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{b.rooms?.room_number ? `Room ${b.rooms.room_number}` : ""}{b.details ? (b.rooms?.room_number ? ` · ${b.details}` : b.details) : (b.rooms?.room_number ? "" : "—")}</td>
                        <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">
                          {b.check_in ? format(new Date(b.check_in), "MMM d") : "—"} → {b.check_out ? format(new Date(b.check_out), "MMM d") : "—"}
                        </td>
                        <td className="p-3">
                          <Badge className={`${statusStyles[b.status] || ""} text-[10px] border-0`}>{b.status}</Badge>
                        </td>
                        <td className="p-3 text-sm font-semibold text-right">KSh {Number(b.amount).toFixed(2)}</td>
                        <td className="p-3 text-right flex items-center justify-end gap-1">
                          {["confirmed", "active"].includes(b.status) && (
                            <>
                              <Button size="sm" variant="ghost" className="text-xs h-7" title="Print Check-in Receipt" onClick={() => handlePrintReceipt(b, "check_in")}>
                                <Printer className="h-3 w-3" />
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => handleCheckout(b)}>
                                <LogOut className="h-3 w-3 mr-1" /> Checkout
                              </Button>
                            </>
                          )}
                          {b.status === "checked_out" && (
                            <Button size="sm" variant="ghost" className="text-xs h-7" title="Print Check-out Receipt" onClick={() => handlePrintReceipt(b, "check_out")}>
                              <Printer className="h-3 w-3 mr-1" /> Receipt
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
