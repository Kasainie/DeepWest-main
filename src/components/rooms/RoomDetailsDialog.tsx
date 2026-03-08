import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Pencil, Trash2, BedDouble } from "lucide-react";
import { toast } from "sonner";
import type { Room } from "./RoomCard";

const ROOM_TYPES = ["Standard", "Deluxe Suite", "Ocean View", "Presidential", "Single", "Twin", "Family"];
const AMENITIES_OPTIONS = ["WiFi", "TV", "Air Conditioning", "Mini Bar", "Balcony", "Bath", "Shower", "Safe", "Room Service", "Sea View"];

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  occupied: "bg-primary/10 text-primary border-primary/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
};

interface RoomDetailsDialogProps {
  room: Room | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

export function RoomDetailsDialog({ room, open, onOpenChange, onUpdated }: RoomDetailsDialogProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    room_number: "",
    type: "Standard",
    floor: "1",
    beds: "1",
    price_per_night: "",
    status: "available",
    amenities: [] as string[],
  });

  const startEdit = () => {
    if (!room) return;
    setForm({
      room_number: room.room_number,
      type: room.type,
      floor: String(room.floor),
      beds: String(room.beds),
      price_per_night: String(room.price_per_night),
      status: room.status,
      amenities: room.amenities || [],
    });
    setEditing(true);
  };

  const toggleAmenity = (amenity: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const handleSave = async () => {
    if (!room) return;
    setSaving(true);
    const { error } = await supabase.from("rooms").update({
      room_number: form.room_number,
      type: form.type,
      floor: parseInt(form.floor),
      beds: parseInt(form.beds),
      price_per_night: parseFloat(form.price_per_night) || 0,
      status: form.status,
      amenities: form.amenities,
    }).eq("id", room.id);

    if (error) {
      if (error.code === "23505") toast.error("Room number already exists");
      else toast.error(error.message);
    } else {
      toast.success("Room updated!");
      setEditing(false);
      onUpdated();
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!room) return;
    setDeleting(true);
    const { error } = await supabase.from("rooms").delete().eq("id", room.id);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Room deleted");
      onOpenChange(false);
      onUpdated();
    }
    setDeleting(false);
  };

  const handleClose = (v: boolean) => {
    if (!v) setEditing(false);
    onOpenChange(v);
  };

  if (!room) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <BedDouble className="h-5 w-5 text-primary" />
            Room {editing ? form.room_number : room.room_number}
          </DialogTitle>
        </DialogHeader>

        {!editing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge className={`${statusColors[room.status] || statusColors.available} text-xs border capitalize`}>
                {room.status}
              </Badge>
              <span className="text-sm text-muted-foreground">{room.type}</span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground text-xs">Floor</p>
                <p className="font-medium">{room.floor}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Beds</p>
                <p className="font-medium">{room.beds}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">Price per Night</p>
                <p className="font-bold text-lg font-display">KSh {Number(room.price_per_night).toLocaleString()}</p>
              </div>
            </div>

            {(room.amenities || []).length > 0 && (
              <div>
                <p className="text-muted-foreground text-xs mb-2">Amenities</p>
                <div className="flex flex-wrap gap-1.5">
                  {room.amenities.map((a) => (
                    <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={deleting}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Room {room.room_number}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. The room and its data will be permanently removed.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      {deleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button size="sm" onClick={startEdit}>
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input value={form.room_number} onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Floor</Label>
                <Input type="number" min="1" value={form.floor} onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Beds</Label>
                <Input type="number" min="1" value={form.beds} onChange={(e) => setForm((f) => ({ ...f, beds: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Price/Night</Label>
                <Input type="number" min="0" step="0.01" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="occupied">Occupied</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amenities</Label>
              <div className="grid grid-cols-2 gap-2">
                {AMENITIES_OPTIONS.map((amenity) => (
                  <label key={amenity} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={form.amenities.includes(amenity)}
                      onCheckedChange={() => toggleAmenity(amenity)}
                    />
                    {amenity}
                  </label>
                ))}
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
