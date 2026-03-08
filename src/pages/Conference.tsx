import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Users, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { formatKES } from "@/lib/currency";
import { AddRoomDialog } from "@/components/conference/AddRoomDialog";
import { BookSpaceDialog } from "@/components/conference/BookSpaceDialog";
import { EditRoomDialog } from "@/components/conference/EditRoomDialog";
import { RoomStatusSelect } from "@/components/conference/RoomStatusSelect";
import { EventCalendar } from "@/components/conference/EventCalendar";
import { EditBookingDialog } from "@/components/conference/EditBookingDialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";

interface ConferenceRoom {
  id: string;
  name: string;
  capacity: number;
  price_per_day: number;
  status: string;
  amenities: string[] | null;
  description: string | null;
}

interface ConferenceBooking {
  id: string;
  event_name: string;
  organizer: string | null;
  attendees: number;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  status: string;
  amount: number;
  notes: string | null;
  room_id: string;
  room_name?: string;
}

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  occupied: "bg-primary/10 text-primary border-primary/20",
  reserved: "bg-warning/10 text-warning border-warning/20",
  maintenance: "bg-muted text-muted-foreground border-muted",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Conference() {
  const { currentCompany } = useCompany();
  const [rooms, setRooms] = useState<ConferenceRoom[]>([]);
  const [bookings, setBookings] = useState<ConferenceBooking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!currentCompany) return;
    setLoading(true);
    const [roomsRes, bookingsRes] = await Promise.all([
      supabase.from("conference_rooms").select("*").eq("company_id", currentCompany.id).order("name"),
      supabase.from("conference_bookings").select("*").eq("company_id", currentCompany.id).order("event_date", { ascending: true }),
    ]);
    const roomList = (roomsRes.data || []) as ConferenceRoom[];
    setRooms(roomList);
    const bookingList = ((bookingsRes.data || []) as ConferenceBooking[]).map((b) => ({
      ...b,
      room_name: roomList.find((r) => r.id === b.room_id)?.name || "Unknown",
    }));
    setBookings(bookingList);
    setLoading(false);
  }, [currentCompany]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDeleteRoom = async (id: string) => {
    const { error } = await supabase.from("conference_rooms").delete().eq("id", id);
    if (error) { toast.error("Failed to delete room"); return; }
    toast.success("Room deleted");
    fetchData();
  };

  const handleCancelBooking = async (id: string) => {
    const { error } = await supabase.from("conference_bookings").update({ status: "cancelled" }).eq("id", id);
    if (error) { toast.error("Failed to cancel booking"); return; }
    toast.success("Booking cancelled");
    fetchData();
  };

  const upcomingBookings = bookings.filter((b) => b.status !== "cancelled" && parseISO(b.event_date) >= new Date(new Date().setHours(0, 0, 0, 0)));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52" />)}
        </div>
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Conference & Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage event spaces and bookings</p>
        </div>
        <div className="flex gap-2">
          <AddRoomDialog onCreated={fetchData} />
          <BookSpaceDialog rooms={rooms} onCreated={fetchData} />
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Rooms", value: rooms.length },
          { label: "Available", value: rooms.filter((r) => r.status === "available").length },
          { label: "Upcoming Events", value: upcomingBookings.length },
          { label: "Total Capacity", value: rooms.reduce((s, r) => s + r.capacity, 0) },
        ].map((s) => (
          <Card key={s.label} className="shadow-card border-0">
            <CardContent className="pt-4 pb-3 px-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="text-2xl font-bold font-display mt-1">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Room Cards */}
      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => {
          const nextBooking = bookings.find((b) => b.room_id === room.id && b.status !== "cancelled" && parseISO(b.event_date) >= new Date(new Date().setHours(0, 0, 0, 0)));
          return (
            <Card key={room.id} className="shadow-card border-0 hover:shadow-elevated transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-display">{room.name}</CardTitle>
                  <Badge className={statusColors[room.status] + " text-[10px] border"}>{room.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" /> Up to {room.capacity} people
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(room.amenities || []).map((a) => (
                    <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{a}</span>
                  ))}
                </div>
                <div className="bg-secondary/50 rounded-lg p-2.5">
                  <p className="text-xs text-muted-foreground">
                    {nextBooking
                      ? `${format(parseISO(nextBooking.event_date), "MMM d")} · ${nextBooking.event_name}`
                      : "No upcoming events"}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold font-display">{formatKES(room.price_per_day, 0)}</span>
                  <span className="text-[10px] text-muted-foreground">per day</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <RoomStatusSelect roomId={room.id} currentStatus={room.status} onUpdated={fetchData} />
                  <div className="flex items-center gap-1">
                    <EditRoomDialog room={room} onUpdated={fetchData} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Room</AlertDialogTitle>
                          <AlertDialogDescription>Are you sure you want to delete "{room.name}"? This will also remove all associated bookings and cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteRoom(room.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {rooms.length === 0 && (
          <Card className="col-span-full shadow-card border-0">
            <CardContent className="py-12 text-center text-muted-foreground">
              No conference rooms yet. Add one to get started.
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Calendar */}
      <motion.div variants={item}>
        <EventCalendar bookings={bookings} />
      </motion.div>

      {/* Upcoming Events List */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No upcoming events</p>
            ) : (
              <div className="space-y-1">
                {upcomingBookings.map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div>
                      <p className="text-sm font-medium">{event.event_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.room_name} · {event.attendees} attendees
                        {event.organizer && ` · ${event.organizer}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {format(parseISO(event.event_date), "MMM d")}
                          {event.end_date && event.end_date !== event.event_date && `–${format(parseISO(event.end_date), "d")}`}
                        </p>
                        <Badge variant={event.status === "confirmed" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {event.status}
                        </Badge>
                      </div>
                      <EditBookingDialog booking={event} rooms={rooms} onUpdated={fetchData} />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive h-7">Cancel</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to cancel "{event.event_name}"? This action cannot be undone.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleCancelBooking(event.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Cancel Booking</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
