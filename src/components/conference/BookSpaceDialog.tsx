import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
  price_per_day: number;
}

interface Props {
  rooms: Room[];
  onCreated: () => void;
}

export function BookSpaceDialog({ rooms, onCreated }: Props) {
  const { currentCompany } = useCompany();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    room_id: "",
    event_name: "",
    organizer: "",
    attendees: 0,
    event_date: undefined as Date | undefined,
    end_date: undefined as Date | undefined,
    start_time: "",
    end_time: "",
    notes: "",
  });

  const selectedRoom = rooms.find((r) => r.id === form.room_id);

  const handleSubmit = async () => {
    if (!currentCompany || !form.room_id || !form.event_name.trim() || !form.event_date) return;
    setLoading(true);

    const days = form.end_date
      ? Math.max(1, Math.ceil((form.end_date.getTime() - form.event_date.getTime()) / 86400000) + 1)
      : 1;
    const amount = (selectedRoom?.price_per_day || 0) * days;

    const { error } = await supabase.from("conference_bookings").insert({
      company_id: currentCompany.id,
      room_id: form.room_id,
      event_name: form.event_name.trim(),
      organizer: form.organizer || null,
      attendees: form.attendees,
      event_date: format(form.event_date, "yyyy-MM-dd"),
      end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      notes: form.notes || null,
      amount,
    });
    setLoading(false);
    if (error) {
      toast.error("Failed to book space");
      return;
    }
    toast.success("Space booked successfully");
    setForm({ room_id: "", event_name: "", organizer: "", attendees: 0, event_date: undefined, end_date: undefined, start_time: "", end_time: "", notes: "" });
    setOpen(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><CalendarDays className="h-4 w-4 mr-1" /> Book Space</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Book Conference Space</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Room</Label>
            <Select value={form.room_id} onValueChange={(v) => setForm((f) => ({ ...f, room_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
              <SelectContent>
                {rooms.filter(r => r.id).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Event Name</Label>
            <Input value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))} placeholder="e.g. Corporate Summit" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Organizer</Label>
              <Input value={form.organizer} onChange={(e) => setForm((f) => ({ ...f, organizer: e.target.value }))} />
            </div>
            <div>
              <Label>Attendees</Label>
              <Input type="number" value={form.attendees} onChange={(e) => setForm((f) => ({ ...f, attendees: +e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.event_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.event_date ? format(form.event_date, "MMM d, yyyy") : "Pick date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.event_date} onSelect={(d) => setForm((f) => ({ ...f, event_date: d }))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.end_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {form.end_date ? format(form.end_date, "MMM d, yyyy") : "Optional"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={form.end_date} onSelect={(d) => setForm((f) => ({ ...f, end_date: d }))} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Time</Label>
              <Input type="time" value={form.start_time} onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))} />
            </div>
            <div>
              <Label>End Time</Label>
              <Input type="time" value={form.end_time} onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !form.room_id || !form.event_name.trim() || !form.event_date} className="w-full">
            {loading ? "Booking…" : "Confirm Booking"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
