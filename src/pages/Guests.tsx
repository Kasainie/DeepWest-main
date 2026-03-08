import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, Plus, Star, Loader2, Users, CalendarDays, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Guest {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  is_vip: boolean;
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
}

interface AvailableRoom {
  id: string;
  room_number: string;
  type: string;
  price_per_night: number;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Guests() {
  const { currentCompany } = useCompany();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteGuest, setDeleteGuest] = useState<Guest | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", id_number: "", is_vip: false });
  const [form, setForm] = useState({
    full_name: "", email: "", phone: "", id_number: "", is_vip: false,
    check_in: "", check_out: "", room_id: "",
  });

  const daysToSpend = useMemo(() => {
    if (!form.check_in || !form.check_out) return 0;
    const diff = new Date(form.check_out).getTime() - new Date(form.check_in).getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [form.check_in, form.check_out]);

  const selectedRoom = availableRooms.find(r => r.id === form.room_id);
  const totalAmount = daysToSpend * (selectedRoom?.price_per_night || 0);

  useEffect(() => {
    if (currentCompany) fetchData();
  }, [currentCompany?.id]);

  const fetchData = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const [gRes, rRes] = await Promise.all([
      supabase.from("guests").select("*").eq("company_id", currentCompany.id).order("full_name"),
      supabase.from("rooms").select("id, room_number, type, price_per_night").eq("company_id", currentCompany.id).eq("status", "available").order("room_number"),
    ]);
    setGuests((gRes.data || []) as Guest[]);
    setAvailableRooms((rRes.data || []) as AvailableRoom[]);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { data: guestData, error } = await supabase.from("guests").insert({
      company_id: currentCompany.id,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      id_number: form.id_number.trim() || null,
      is_vip: form.is_vip,
    }).select("id").single();

    if (error) {
      toast.error(error.message);
      setSaving(false);
      return;
    }

    // If room & dates selected, create a booking too
    if (form.room_id && form.check_in && daysToSpend > 0 && guestData) {
      await supabase.from("bookings").insert({
        company_id: currentCompany.id,
        guest_id: guestData.id,
        room_id: form.room_id,
        booking_type: "room",
        check_in: form.check_in,
        check_out: form.check_out || null,
        status: "confirmed",
        amount: totalAmount,
        details: `Room ${selectedRoom?.room_number} · ${daysToSpend} night${daysToSpend !== 1 ? "s" : ""}`,
      });
      await supabase.from("rooms").update({ status: "occupied" }).eq("id", form.room_id);
    }

    toast.success("Guest added!");
    setForm({ full_name: "", email: "", phone: "", id_number: "", is_vip: false, check_in: "", check_out: "", room_id: "" });
    setAddOpen(false);
    fetchData();
    setSaving(false);
  };

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return g.full_name.toLowerCase().includes(q) || (g.email || "").toLowerCase().includes(q) || (g.phone || "").toLowerCase().includes(q) || (g.id_number || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Guests</h1>
          <p className="text-sm text-muted-foreground mt-1">{guests.length} guest{guests.length !== 1 ? "s" : ""} total</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Guest</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display">Add New Guest</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Smith" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 700 123456" />
                </div>
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input value={form.id_number} onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))} placeholder="12345678" maxLength={30} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@email.com" />
              </div>

              {/* Room & Stay Duration */}
              <div className="space-y-2">
                <Label>Assign Room (optional)</Label>
                <Select value={form.room_id} onValueChange={(v) => setForm((f) => ({ ...f, room_id: v }))}>
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

              {form.room_id && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Check In</Label>
                      <Input type="date" value={form.check_in} onChange={(e) => setForm((f) => ({ ...f, check_in: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Check Out</Label>
                      <Input type="date" value={form.check_out} onChange={(e) => setForm((f) => ({ ...f, check_out: e.target.value }))} min={form.check_in || undefined} />
                    </div>
                  </div>
                  {daysToSpend > 0 && selectedRoom && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50 text-sm">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      <span className="font-medium">{daysToSpend} night{daysToSpend !== 1 ? "s" : ""}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="font-semibold text-primary">KSh {totalAmount.toLocaleString()}</span>
                      <span className="text-muted-foreground text-xs">({selectedRoom.price_per_night.toLocaleString()}/night)</span>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3">
                <Switch checked={form.is_vip} onCheckedChange={(v) => setForm((f) => ({ ...f, is_vip: v }))} />
                <Label>VIP Guest</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Guest
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={item} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search guests..." className="pl-9 bg-card border-0 shadow-soft" value={search} onChange={(e) => setSearch(e.target.value)} />
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold mb-1">{guests.length === 0 ? "No guests yet" : "No matching guests"}</h3>
              <p className="text-sm text-muted-foreground">{guests.length === 0 ? "Add your first guest to get started" : "Try a different search term"}</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((guest) => (
            <Card key={guest.id} className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                      {guest.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{guest.full_name}</p>
                      <p className="text-xs text-muted-foreground">{guest.phone || "No phone"}</p>
                      {guest.id_number && <p className="text-[10px] text-muted-foreground">ID: {guest.id_number}</p>}
                    </div>
                  </div>
                  {guest.is_vip && (
                    <Badge className="bg-warning/10 text-warning border-0 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> VIP
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center bg-secondary/50 rounded-lg p-3">
                  <div>
                    <p className="text-lg font-bold font-display">{guest.total_visits}</p>
                    <p className="text-[10px] text-muted-foreground">Visits</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-display">KSh {Number(guest.total_spent).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Spent</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mt-1">{guest.last_visit ? new Date(guest.last_visit).toLocaleDateString() : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Last Visit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}