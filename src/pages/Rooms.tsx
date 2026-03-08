import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Filter, BedDouble, Wifi, Bath, Tv } from "lucide-react";
import { motion } from "framer-motion";

const rooms = [
  { id: 101, type: "Deluxe Suite", floor: 1, beds: 1, price: 350, status: "occupied", guest: "James Anderson", checkout: "Mar 12" },
  { id: 102, type: "Deluxe Suite", floor: 1, beds: 2, price: 350, status: "occupied", guest: "Lisa Wong", checkout: "Mar 10" },
  { id: 201, type: "Ocean View", floor: 2, beds: 1, price: 250, status: "available", guest: null, checkout: null },
  { id: 202, type: "Ocean View", floor: 2, beds: 2, price: 280, status: "available", guest: null, checkout: null },
  { id: 301, type: "Standard", floor: 3, beds: 1, price: 150, status: "occupied", guest: "Robert Chen", checkout: "Mar 11" },
  { id: 302, type: "Standard", floor: 3, beds: 2, price: 170, status: "maintenance", guest: null, checkout: null },
  { id: 401, type: "Presidential", floor: 4, beds: 1, price: 800, status: "available", guest: null, checkout: null },
  { id: 402, type: "Presidential", floor: 4, beds: 2, price: 1200, status: "occupied", guest: "Emily Davis", checkout: "Mar 14" },
];

const statusColors: Record<string, string> = {
  available: "bg-success/10 text-success border-success/20",
  occupied: "bg-primary/10 text-primary border-primary/20",
  maintenance: "bg-warning/10 text-warning border-warning/20",
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Rooms() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage 80 rooms across 4 floors</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Room</Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {rooms.map((room) => (
          <Card key={room.id} className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer group">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-display">Room {room.id}</CardTitle>
                <Badge className={statusColors[room.status] + " text-[10px] border"}>
                  {room.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{room.type}</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><BedDouble className="h-3 w-3" /> {room.beds} bed</span>
                <span className="flex items-center gap-1"><Wifi className="h-3 w-3" /> WiFi</span>
                <span className="flex items-center gap-1"><Bath className="h-3 w-3" /> Bath</span>
                <span className="flex items-center gap-1"><Tv className="h-3 w-3" /> TV</span>
              </div>
              {room.guest && (
                <div className="bg-secondary/50 rounded-lg p-2.5">
                  <p className="text-xs font-medium">{room.guest}</p>
                  <p className="text-[10px] text-muted-foreground">Checkout: {room.checkout}</p>
                </div>
              )}
              <div className="flex items-center justify-between pt-1">
                <span className="text-lg font-bold font-display">${room.price}</span>
                <span className="text-[10px] text-muted-foreground">per night</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}
