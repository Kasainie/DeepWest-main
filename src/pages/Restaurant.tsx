import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Clock, Users } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { UtensilsCrossed, DollarSign, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const tables = Array.from({ length: 16 }, (_, i) => ({
  id: i + 1,
  seats: [2, 4, 6, 8][i % 4],
  status: ["available", "occupied", "reserved", "occupied"][i % 4] as string,
  guest: i % 4 === 1 ? "Table occupied" : i % 4 === 3 ? "Table occupied" : null,
  time: i % 4 === 2 ? "7:30 PM" : null,
}));

const reservations = [
  { name: "Johnson Party", guests: 8, time: "6:00 PM", table: 4, notes: "Anniversary dinner" },
  { name: "Chen Family", guests: 4, time: "7:00 PM", table: 7, notes: "Allergies: shellfish" },
  { name: "Smith Group", guests: 6, time: "7:30 PM", table: 3, notes: "Birthday celebration" },
  { name: "Williams", guests: 2, time: "8:00 PM", table: 12, notes: "Window seat requested" },
  { name: "Davis Party", guests: 10, time: "8:30 PM", table: 8, notes: "Business dinner" },
];

const tableStatusColors: Record<string, string> = {
  available: "bg-success/20 border-success/40",
  occupied: "bg-primary/20 border-primary/40",
  reserved: "bg-warning/20 border-warning/40",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Restaurant() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Restaurant</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage tables and reservations</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Reservation</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Today's Covers" value="142" change="+18 from yesterday" changeType="positive" icon={UtensilsCrossed} />
        <StatCard title="Revenue" value="$4,280" change="+12%" changeType="positive" icon={DollarSign} />
        <StatCard title="Avg per Cover" value="$30.14" change="+$2.30" changeType="positive" icon={TrendingUp} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <motion.div variants={item} className="lg:col-span-3">
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-display">Floor Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3">
                {tables.map((table) => (
                  <button
                    key={table.id}
                    className={`aspect-square rounded-xl border-2 flex flex-col items-center justify-center transition-all hover:scale-105 ${tableStatusColors[table.status]}`}
                  >
                    <span className="text-sm font-bold">T{table.id}</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Users className="h-2.5 w-2.5" /> {table.seats}
                    </span>
                    {table.time && (
                      <span className="text-[10px] text-warning flex items-center gap-0.5 mt-0.5">
                        <Clock className="h-2.5 w-2.5" /> {table.time}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-success/40" /> Available</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-primary/40" /> Occupied</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning/40" /> Reserved</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Tonight's Reservations</CardTitle>
                <Badge variant="secondary">{reservations.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {reservations.map((res, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{res.name}</p>
                    <p className="text-xs text-muted-foreground">{res.notes}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{res.time}</p>
                    <p className="text-xs text-muted-foreground">{res.guests} guests · T{res.table}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
