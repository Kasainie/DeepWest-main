import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Pencil } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Room {
  id: string;
  name: string;
}

interface Booking {
  id: string;
  room_id: string;
  event_name: string;
  organizer: string | null;
  attendees: number;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  notes: string | null;
}

interface Props {
  booking: Booking;
  rooms: Room[];
  onUpdated: () => void;
}

export function EditBookingDialog({ booking, rooms, onUpdated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    room_id: booking.room_id,
    event_name: booking.event_name,
    organizer: booking.organizer || "",
    attendees: booking.attendees,
    event_date: parseISO(booking.event_date) as Date | undefined,
    end_date: booking.end_date ? parseISO(booking.end_date) : undefined as Date | undefined,
    start_time: booking.start_time || "",
    end_time: booking.end_time || "",
    status: booking.status,
    notes: booking.notes || "",
  });

  const handleSubmit = async () => {
    if (!form.event_name.trim() || !form.event_date) return;
    setLoading(true);
    const { error } = await supabase.from("conference_bookings").update({
      room_id: form.room_id,
      event_name: form.event_name.trim(),
      organizer: form.organizer || null,
      attendees: form.attendees,
      event_date: format(form.event_date, "yyyy-MM-dd"),
      end_date: form.end_date ? format(form.end_date, "yyyy-MM-dd") : null,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      status: form.status,
      notes: form.notes || null,
    }).eq("id", booking.id);
    setLoading(false);
    if (error) { toast.error("Failed to update booking"); return; }
    toast.success("Booking updated");
    setOpen(false);
    onUpdated();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => {
      setOpen(v);
      if (v) setForm({
        room_id: booking.room_id,
        event_name: booking.event_name,
        organizer: booking.organizer || "",
        attendees: booking.attendees,
        event_date: parseISO(booking.event_date),
        end_date: booking.end_date ? parseISO(booking.end_date) : undefined,
        start_time: booking.start_time || "",
        end_time: booking.end_time || "",
        status: booking.status,
        notes: booking.notes || "",
      });
    }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs h-7"><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Edit Booking</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Room</Label>
            <Select value={form.room_id} onValueChange={(v) => setForm((f) => ({ ...f, room_id: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Event Name</Label>
            <Input value={form.event_name} onChange={(e) => setForm((f) => ({ ...f, event_name: e.target.value }))} />
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
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
          </div>
          <Button onClick={handleSubmit} disabled={loading || !form.event_name.trim() || !form.event_date} className="w-full">
            {loading ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
