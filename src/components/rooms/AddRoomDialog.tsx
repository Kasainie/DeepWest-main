import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ROOM_TYPES = ["Standard", "Deluxe Suite", "Ocean View", "Presidential", "Single", "Twin", "Family"];
const AMENITIES_OPTIONS = ["WiFi", "TV", "Air Conditioning", "Mini Bar", "Balcony", "Bath", "Shower", "Safe", "Room Service", "Sea View"];

interface AddRoomDialogProps {
  companyId: string;
  onAdded: () => void;
}

export function AddRoomDialog({ companyId, onAdded }: AddRoomDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    room_number: "",
    type: "Standard",
    floor: "1",
    beds: "1",
    price_per_night: "",
    amenities: [] as string[],
  });

  const toggleAmenity = (amenity: string) => {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(amenity)
        ? f.amenities.filter((a) => a !== amenity)
        : [...f.amenities, amenity],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase.from("rooms").insert({
      company_id: companyId,
      room_number: form.room_number,
      type: form.type,
      floor: parseInt(form.floor),
      beds: parseInt(form.beds),
      price_per_night: parseFloat(form.price_per_night) || 0,
      amenities: form.amenities,
    });

    if (error) {
      if (error.code === "23505") toast.error("Room number already exists");
      else toast.error(error.message);
    } else {
      toast.success("Room added!");
      setForm({ room_number: "", type: "Standard", floor: "1", beds: "1", price_per_night: "", amenities: [] });
      setOpen(false);
      onAdded();
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Room
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add New Room</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Room Number</Label>
              <Input value={form.room_number} onChange={(e) => setForm((f) => ({ ...f, room_number: e.target.value }))} placeholder="101" required />
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
              <Input type="number" min="0" step="0.01" value={form.price_per_night} onChange={(e) => setForm((f) => ({ ...f, price_per_night: e.target.value }))} placeholder="150" required />
            </div>
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
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Room
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
