import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Monitor, Wifi, Users, Projector, Coffee } from "lucide-react";
import { motion } from "framer-motion";

const rooms = [
  { name: "Grand Ballroom", capacity: 200, price: 2500, status: "available", amenities: ["Projector", "Sound", "WiFi", "Catering"], nextBooking: "Mar 15 · Corporate Summit" },
  { name: "Executive Board Room", capacity: 20, price: 800, status: "occupied", amenities: ["TV", "WiFi", "Whiteboard"], nextBooking: "In use · Until 4 PM" },
  { name: "Innovation Lab", capacity: 40, price: 1200, status: "available", amenities: ["Projector", "WiFi", "Screens"], nextBooking: "Mar 12 · Workshop" },
  { name: "Garden Pavilion", capacity: 100, price: 1800, status: "reserved", amenities: ["Sound", "WiFi", "Catering"], nextBooking: "Mar 14 · Wedding Reception" },
  { name: "Skyline Suite", capacity: 50, price: 1500, status: "available", amenities: ["TV", "WiFi", "Bar"], nextBooking: "No upcoming" },
  { name: "Library Room", capacity: 12, price: 500, status: "maintenance", amenities: ["TV", "WiFi"], nextBooking: "Maintenance until Mar 11" },
];

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  occupied: "bg-primary/10 text-primary border-primary/20",
  reserved: "bg-warning/10 text-warning border-warning/20",
  maintenance: "bg-muted text-muted-foreground border-muted",
};

const upcomingEvents = [
  { name: "Corporate Summit 2026", room: "Grand Ballroom", date: "Mar 15-16", attendees: 180, status: "confirmed" },
  { name: "Tech Workshop", room: "Innovation Lab", date: "Mar 12", attendees: 35, status: "confirmed" },
  { name: "Wedding Reception", room: "Garden Pavilion", date: "Mar 14", attendees: 90, status: "pending" },
  { name: "Board Meeting Q1", room: "Executive Board Room", date: "Mar 18", attendees: 15, status: "confirmed" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Conference() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Conference & Events</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage event spaces and bookings</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Book Space</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooms.map((room) => (
          <Card key={room.name} className="shadow-card border-0 hover:shadow-elevated transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">{room.name}</CardTitle>
                <Badge className={statusColors[room.status] + " text-[10px] border"}>
                  {room.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" /> Up to {room.capacity} people
              </div>
              <div className="flex flex-wrap gap-1.5">
                {room.amenities.map((a) => (
                  <span key={a} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {a}
                  </span>
                ))}
              </div>
              <div className="bg-secondary/50 rounded-lg p-2.5">
                <p className="text-xs text-muted-foreground">{room.nextBooking}</p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold font-display">${room.price.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">per day</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{event.name}</p>
                    <p className="text-xs text-muted-foreground">{event.room} · {event.attendees} attendees</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{event.date}</p>
                    <Badge variant={event.status === "confirmed" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                      {event.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
