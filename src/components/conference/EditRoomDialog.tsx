import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AMENITY_OPTIONS = ["Projector", "Sound System", "WiFi", "Catering", "TV", "Whiteboard", "Screens", "Bar", "AC"];

interface Room {
  id: string;
  name: string;
  capacity: number;
  price_per_day: number;
  description: string | null;
  amenities: string[] | null;
}

interface Props {
  room: Room;
  onUpdated: () => void;
}

export function EditRoomDialog({ room, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: room.name,
    capacity: room.capacity,
    price_per_day: room.price_per_day,
    description: room.description || "",
    amenities: room.amenities || [],
  });

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("conference_rooms").update({
      name: form.name.trim(),
      capacity: form.capacity,
      price_per_day: form.price_per_day,
      description: form.description || null,
      amenities: form.amenities,
    }).eq("id", room.id);
    setLoading(false);
    if (error) { toast.error("Failed to update room"); return; }
    toast.success("Room updated");
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) setForm({ name: room.name, capacity: room.capacity, price_per_day: room.price_per_day, description: room.description || "", amenities: room.amenities || [] });
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="h-3.5 w-3.5" /></Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Room Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Capacity</Label>
              <Input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: +e.target.value }))} />
            </div>
            <div>
              <Label>Price / Day (KSh)</Label>
              <Input type="number" value={form.price_per_day} onChange={(e) => setForm((f) => ({ ...f, price_per_day: +e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Amenities</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {AMENITY_OPTIONS.map((a) => (
                <button key={a} type="button" onClick={() => toggleAmenity(a)} className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.amenities.includes(a) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border"}`}>
                  {a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !form.name.trim()} className="w-full">
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
