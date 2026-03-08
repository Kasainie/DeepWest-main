import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, BedDouble, Wifi, Bath, Tv, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Room {
  id: string;
  room_number: string;
  type: string;
  floor: number;
  beds: number;
  price_per_night: number;
  status: string;
  amenities: string[];
}

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  occupied: "bg-primary/10 text-primary border-primary/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Rooms() {
  const { currentCompany } = useCompany();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ room_number: "", type: "Standard", floor: "1", beds: "1", price_per_night: "" });

  useEffect(() => {
    if (currentCompany) fetchRooms();
  }, [currentCompany?.id]);

  const fetchRooms = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("room_number");
    setRooms((data || []) as Room[]);
    setLoading(false);
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { error } = await supabase.from("rooms").insert({
      company_id: currentCompany.id,
      room_number: form.room_number,
      type: form.type,
      floor: parseInt(form.floor),
      beds: parseInt(form.beds),
      price_per_night: parseFloat(form.price_per_night) || 0,
    });

    if (error) {
      if (error.code === "23505") toast.error("Room number already exists");
      else toast.error(error.message);
    } else {
      toast.success("Room added!");
      setForm({ room_number: "", type: "Standard", floor: "1", beds: "1", price_per_night: "" });
      setAddOpen(false);
      fetchRooms();
    }
    setSaving(false);
  };

  const toggleStatus = async (room: Room) => {
    const nextStatus = room.status === "available" ? "occupied" : room.status === "occupied" ? "maintenance" : "available";
    const { error } = await supabase.from("rooms").update({ status: nextStatus }).eq("id", room.id);
    if (!error) {
      setRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: nextStatus } : r)));
    }
  };

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
          <h1 className="text-2xl font-bold font-display">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rooms.length} room{rooms.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Room</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add New Room</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddRoom} className="space-y-4 mt-2">
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
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe Suite">Deluxe Suite</SelectItem>
                      <SelectItem value="Ocean View">Ocean View</SelectItem>
                      <SelectItem value="Presidential">Presidential</SelectItem>
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
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Room
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      {rooms.length === 0 ? (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardContent className="text-center py-12">
              <BedDouble className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold mb-1">No rooms yet</h3>
              <p className="text-sm text-muted-foreground">Add your first room to get started</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {rooms.map((room) => (
            <Card key={room.id} className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer group" onClick={() => toggleStatus(room)}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display">Room {room.room_number}</CardTitle>
                  <Badge className={`${statusColors[room.status] || statusColors.available} text-[10px] border`}>
                    {room.status}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{room.type}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {room.beds} bed{room.beds > 1 ? "s" : ""}</span>
                  <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> WiFi</span>
                  <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> Bath</span>
                  <span className="flex items-center gap-1"><Tv className="h-3 w-3" /> TV</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-lg font-bold font-display">KSh {Number(room.price_per_night).toLocaleString()}</span>
                  <span className="text-[10px] text-muted-foreground">per night</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
