import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, UtensilsCrossed, Users, DollarSign, TrendingUp, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

const recentBookings = [
  { id: "B-1024", guest: "James Anderson", type: "Room", details: "Deluxe Suite · 3 nights", status: "confirmed", amount: "$1,250" },
  { id: "B-1025", guest: "Sarah Mitchell", type: "Restaurant", details: "Table for 6 · Tonight 8PM", status: "pending", amount: "$320" },
  { id: "B-1026", guest: "Robert Chen", type: "Conference", details: "Grand Hall · Mar 15", status: "confirmed", amount: "$2,800" },
  { id: "B-1027", guest: "Emily Davis", type: "Room", details: "Ocean View · 5 nights", status: "confirmed", amount: "$2,100" },
  { id: "B-1028", guest: "Michael Brown", type: "Bar", details: "VIP Lounge · Sat 9PM", status: "pending", amount: "$450" },
];

const roomOccupancy = [
  { type: "Deluxe Suite", total: 12, occupied: 10 },
  { type: "Ocean View", total: 24, occupied: 18 },
  { type: "Standard", total: 40, occupied: 32 },
  { type: "Presidential", total: 4, occupied: 3 },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your property overview.</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Revenue Today" value="$12,450" change="+12% from yesterday" changeType="positive" icon={DollarSign} />
        <StatCard title="Room Occupancy" value="78%" change="63 of 80 rooms" changeType="positive" icon={BedDouble} />
        <StatCard title="Restaurant Covers" value="142" change="+8% vs last week" changeType="positive" icon={UtensilsCrossed} />
        <StatCard title="Total Guests" value="187" change="23 check-ins today" changeType="neutral" icon={Users} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Recent Bookings</CardTitle>
                <Badge variant="secondary" className="text-xs">{recentBookings.length} new</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {recentBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                        {booking.type === "Room" && <BedDouble className="h-4 w-4 text-primary" />}
                        {booking.type === "Restaurant" && <UtensilsCrossed className="h-4 w-4 text-primary" />}
                        {booking.type === "Conference" && <CalendarDays className="h-4 w-4 text-primary" />}
                        {booking.type === "Bar" && <TrendingUp className="h-4 w-4 text-primary" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{booking.guest}</p>
                        <p className="text-xs text-muted-foreground">{booking.details}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{booking.amount}</p>
                      <Badge variant={booking.status === "confirmed" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                        {booking.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Room Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roomOccupancy.map((room) => (
                <div key={room.type} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{room.type}</span>
                    <span className="text-muted-foreground">{room.occupied}/{room.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${(room.occupied / room.total) * 100}%` }}
                    />
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
