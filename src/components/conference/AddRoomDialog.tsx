import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

const AMENITY_OPTIONS = ["Projector", "Sound System", "WiFi", "Catering", "TV", "Whiteboard", "Screens", "Bar", "AC"];

interface Props {
  onCreated: () => void;
}

export function AddRoomDialog({ onCreated }: Props) {
  const { currentCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    capacity: 20,
    price_per_day: 0,
    description: "",
    amenities: [] as string[],
  });

  const toggleAmenity = (a: string) =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const handleSubmit = async () => {
    if (!currentCompany || !form.name.trim()) return;
    setLoading(true);
    const { error } = await supabase.from("conference_rooms").insert({
      company_id: currentCompany.id,
      name: form.name.trim(),
      capacity: form.capacity,
      price_per_day: form.price_per_day,
      description: form.description || null,
      amenities: form.amenities,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to add room");
      return;
    }
    toast.success("Room added");
    setForm({ name: "", capacity: 20, price_per_day: 0, description: "", amenities: [] });
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Room</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Add Conference Room</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Room Name</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Grand Ballroom" />
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
                <button
                  key={a}
                  type="button"
                  onClick={() => toggleAmenity(a)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    form.amenities.includes(a)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-secondary text-secondary-foreground border-border"
                  }`}
                >
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
            {loading ? "Adding…" : "Add Room"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
