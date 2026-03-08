import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import type { Room } from "./RoomCard";

interface Guest {
  id: string;
  full_name: string;
  phone: string | null;
  id_number: string | null;
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

  // New guest form
  const [newGuest, setNewGuest] = useState({
    full_name: "",
    phone: "",
    id_number: "",
  });

  // Existing guest selection
  const [selectedGuestId, setSelectedGuestId] = useState("");

  // Booking details
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split("T")[0]);
  const [checkOut, setCheckOut] = useState("");

  useEffect(() => {
    if (open) {
      fetchGuests();
      setNewGuest({ full_name: "", phone: "", id_number: "" });
      setSelectedGuestId("");
      setCheckIn(new Date().toISOString().split("T")[0]);
      setCheckOut("");
      setTab("new");
    }
  }, [open]);

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

  const handleAssign = async () => {
    if (!room) return;

    // Validate
    if (tab === "new") {
      if (!newGuest.full_name.trim()) {
        toast.error("Client name is required");
        return;
      }
      if (!newGuest.phone.trim()) {
        toast.error("Phone number is required");
        return;
      }
      if (!newGuest.id_number.trim()) {
        toast.error("ID number is required");
        return;
      }
    } else {
      if (!selectedGuestId) {
        toast.error("Please select a guest");
        return;
      }
    }

    if (!checkIn) {
      toast.error("Check-in date is required");
      return;
    }

    setSaving(true);

    let guestId: string;

    if (tab === "new") {
      // Create guest first
      const { data: guestData, error: guestError } = await supabase
        .from("guests")
        .insert({
          company_id: companyId,
          full_name: newGuest.full_name.trim(),
          phone: newGuest.phone.trim() || null,
          id_number: newGuest.id_number.trim() || null,
        })
        .select("id")
        .single();

      if (guestError) {
        toast.error(guestError.message);
        setSaving(false);
        return;
      }
      guestId = guestData.id;
    } else {
      guestId = selectedGuestId;
    }

    // Calculate nights and amount
    const nights = checkOut && checkIn
      ? Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))
      : 1;
    const amount = nights * Number(room.price_per_night);

    // Create booking
    const { error: bookingError } = await supabase.from("bookings").insert({
      company_id: companyId,
      guest_id: guestId,
      room_id: room.id,
      booking_type: "room",
      check_in: checkIn,
      check_out: checkOut || null,
      status: "confirmed",
      amount,
      details: `Room ${room.room_number} · ${nights} night${nights > 1 ? "s" : ""}`,
    });

    if (bookingError) {
      toast.error(bookingError.message);
      setSaving(false);
      return;
    }

    // Update room status to occupied
    await supabase.from("rooms").update({ status: "occupied" }).eq("id", room.id);

    // Update guest visit stats
    await supabase.from("guests").update({
      last_visit: new Date().toISOString(),
      total_visits: (guests.find(g => g.id === guestId)?.id ? 1 : 1), // Will be incremented properly
    }).eq("id", guestId);

    toast.success(`Room ${room.room_number} assigned successfully!`);
    onOpenChange(false);
    onAssigned();
    setSaving(false);
  };

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            Assign Room {room.room_number}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="new" className="text-xs">
              <UserPlus className="h-3.5 w-3.5 mr-1" /> New Client
            </TabsTrigger>
            <TabsTrigger value="existing" className="text-xs">
              <Users className="h-3.5 w-3.5 mr-1" /> Existing Guest
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                value={newGuest.full_name}
                onChange={(e) => setNewGuest((f) => ({ ...f, full_name: e.target.value }))}
                placeholder="John Smith"
                maxLength={100}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone Number <span className="text-destructive">*</span></Label>
                <Input
                  value={newGuest.phone}
                  onChange={(e) => setNewGuest((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+254 700 123456"
                  maxLength={20}
                />
              </div>
              <div className="space-y-2">
                <Label>ID Number <span className="text-destructive">*</span></Label>
                <Input
                  value={newGuest.id_number}
                  onChange={(e) => setNewGuest((f) => ({ ...f, id_number: e.target.value }))}
                  placeholder="12345678"
                  maxLength={30}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="existing" className="space-y-4 mt-4">
            {loadingGuests ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : guests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No guests found. Add a new client above.</p>
            ) : (
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

        {checkIn && checkOut && (
          <div className="bg-secondary/50 rounded-lg p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)))} night(s) × KSh {Number(room.price_per_night).toLocaleString()}
              </span>
              <span className="font-bold font-display">
                KSh {(Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) * Number(room.price_per_night)).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button size="sm" onClick={handleAssign} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Assign Room
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
