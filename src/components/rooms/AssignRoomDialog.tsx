import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, UserPlus, Users, X, Plus } from "lucide-react";
import { toast } from "sonner";
import type { Room } from "./RoomCard";

interface Guest {
  id: string;
  full_name: string;
  phone: string | null;
  id_number: string | null;
}

interface PendingGuest {
  type: "new" | "existing";
  id?: string; // for existing guests
  full_name: string;
  phone: string;
  id_number: string;
}

interface AssignRoomDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: string;
  onAssigned: () => void;
}

export function AssignRoomDialog({ room, open, onOpenChange, companyId, onAssigned }: AssignRoomDialogProps) {
  const [tab, setTab] = useState<string>("new");
  const [saving, setSaving] = useState(false);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [pendingGuests, setPendingGuests] = useState<PendingGuest[]>([]);

  // New guest form
  const [newGuest, setNewGuest] = useState({ full_name: "", phone: "", id_number: "" });

  // Existing guest selection
  const [selectedGuestId, setSelectedGuestId] = useState("");

  // Booking details
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState("");

  useEffect(() => {
    if (open) {
      fetchGuests();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setNewGuest({ full_name: "", phone: "", id_number: "" });
    setSelectedGuestId("");
    setCheckIn(new Date().toISOString().split("T")[0]);
    setCheckOut("");
    setTab("new");
    setPendingGuests([]);
  };

  const fetchGuests = async () => {
    setLoadingGuests(true);
    const { data } = await supabase
      .from("guests")
      .select("id, full_name, phone, id_number")
      .eq("company_id", companyId)
      .order("full_name");
    setGuests((data || []) as Guest[]);
    setLoadingGuests(false);
  };

  const addNewGuest = () => {
    if (!newGuest.full_name.trim()) { toast.error("Client name is required"); return; }
    if (!newGuest.phone.trim()) { toast.error("Phone number is required"); return; }
    if (!newGuest.id_number.trim()) { toast.error("ID number is required"); return; }

    setPendingGuests((prev) => [
      ...prev,
      { type: "new", full_name: newGuest.full_name.trim(), phone: newGuest.phone.trim(), id_number: newGuest.id_number.trim() },
    ]);
    setNewGuest({ full_name: "", phone: "", id_number: "" });
    toast.success("Client added to list");
  };

  const addExistingGuest = () => {
    if (!selectedGuestId) { toast.error("Please select a guest"); return; }
    if (pendingGuests.some((p) => p.id === selectedGuestId)) {
      toast.error("Guest already added");
      return;
    }
    const guest = guests.find((g) => g.id === selectedGuestId);
    if (!guest) return;

    setPendingGuests((prev) => [
      ...prev,
      { type: "existing", id: guest.id, full_name: guest.full_name, phone: guest.phone || "", id_number: guest.id_number || "" },
    ]);
    setSelectedGuestId("");
    toast.success("Guest added to list");
  };

  const removeGuest = (index: number) => {
    setPendingGuests((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAssign = async () => {
    if (!room) return;
    if (pendingGuests.length === 0) {
      toast.error("Add at least one client");
      return;
    }
    if (!checkIn) {
      toast.error("Check-in date is required");
      return;
    }

    setSaving(true);

    const nights = checkOut && checkIn
      ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const amount = nights * Number(room.price_per_night);

    // Resolve all guest IDs (create new guests as needed)
    const guestIds: string[] = [];
    for (const pg of pendingGuests) {
      if (pg.type === "existing" && pg.id) {
        guestIds.push(pg.id);
      } else {
        const { data, error } = await supabase
          .from("guests")
          .insert({ company_id: companyId, full_name: pg.full_name, phone: pg.phone || null, id_number: pg.id_number || null })
          .select("id")
          .single();
        if (error) { toast.error(error.message); setSaving(false); return; }
        guestIds.push(data.id);
      }
    }

    // Create a booking for each guest
    const bookings = guestIds.map((guestId) => ({
      company_id: companyId,
      guest_id: guestId,
      room_id: room.id,
      booking_type: "room",
      check_in: checkIn,
      check_out: checkOut || null,
      status: "confirmed",
      amount,
      details: `Room ${room.room_number} · ${nights} night${nights > 1 ? "s" : ""} · ${pendingGuests.length} guest${pendingGuests.length > 1 ? "s" : ""}`,
    }));

    const { error: bookingError } = await supabase.from("bookings").insert(bookings);
    if (bookingError) { toast.error(bookingError.message); setSaving(false); return; }

    // Update room status
    await supabase.from("rooms").update({ status: "occupied" }).eq("id", room.id);

    // Update guest visit stats
    for (const gid of guestIds) {
      await supabase.from("guests").update({ last_visit: new Date().toISOString() }).eq("id", gid);
    }

    toast.success(`Room ${room.room_number} assigned to ${pendingGuests.length} client${pendingGuests.length > 1 ? "s" : ""}!`);
    onOpenChange(false);
    onAssigned();
    setSaving(false);
  };

  if (!room) return null;

  const nights = checkOut && checkIn
    ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-display">Assign Room {room.room_number}</DialogTitle>
        </DialogHeader>

        {/* Added guests list */}
        {pendingGuests.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Clients to assign ({pendingGuests.length})</Label>
            <ScrollArea className="max-h-28">
              <div className="space-y-1.5">
                {pendingGuests.map((pg, i) => (
                  <div key={i} className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-1.5 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium truncate">{pg.full_name}</span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {pg.type === "new" ? "New" : "Existing"}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeGuest(i)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab} className="mt-1">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> New Client
            </TabsTrigger>
            <TabsTrigger value="existing" className="text-xs">
              <Users className="h-3.5 w-3.5 mr-1" /> Existing Guest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-3 mt-3">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input value={newGuest.full_name} onChange={(e) => setNewGuest((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Smith" maxLength={100} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone <span className="text-destructive">*</span></Label>
                <Input value={newGuest.phone} onChange={(e) => setNewGuest((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 700 123456" maxLength={20} />
              </div>
              <div className="space-y-2">
                <Label>ID Number <span className="text-destructive">*</span></Label>
                <Input value={newGuest.id_number} onChange={(e) => setNewGuest((f) => ({ ...f, id_number: e.target.value }))} placeholder="12345678" maxLength={30} />
              </div>
            </div>
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={addNewGuest}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Client
            </Button>
          </TabsContent>

          <TabsContent value="existing" className="space-y-3 mt-3">
            {loadingGuests ? (
              <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" /></div>
            ) : guests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No guests found. Add a new client above.</p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Guest</Label>
                  <Select value={selectedGuestId} onValueChange={setSelectedGuestId}>
                    <SelectTrigger><SelectValue placeholder="Choose a guest" /></SelectTrigger>
                    <SelectContent>
                      {guests.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.full_name}{g.phone ? ` · ${g.phone}` : ""}{g.id_number ? ` · ID: ${g.id_number}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="secondary" size="sm" className="w-full" onClick={addExistingGuest}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add Guest
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-2">
            <Label>Check In <span className="text-destructive">*</span></Label>
            <Input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Check Out</Label>
            <Input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} min={checkIn} />
          </div>
        </div>

        {nights > 0 && (
          <div className="bg-secondary/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {nights} night(s) × KSh {Number(room.price_per_night).toLocaleString()}
                {pendingGuests.length > 1 && ` × ${pendingGuests.length} clients`}
              </span>
              <span className="font-bold font-display">
                KSh {(nights * Number(room.price_per_night) * pendingGuests.length).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={saving || pendingGuests.length === 0}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign {pendingGuests.length > 0 ? `${pendingGuests.length} Client${pendingGuests.length > 1 ? "s" : ""}` : "Room"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
