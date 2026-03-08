import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { StatCard } from "@/components/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, UtensilsCrossed, Users, DollarSign, TrendingUp, CalendarDays, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const bookingTypeIcons: Record<string, typeof BedDouble> = {
  room: BedDouble,
  restaurant: UtensilsCrossed,
  conference: CalendarDays,
  bar: TrendingUp,
};

interface RoomStats {
  type: string;
  total: number;
  occupied: number;
}

export default function Dashboard() {
  const { currentCompany } = useCompany();
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [roomStats, setRoomStats] = useState<RoomStats[]>([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [occupiedRooms, setOccupiedRooms] = useState(0);
  const [totalGuests, setTotalGuests] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCompany) return;
    fetchDashboardData();
  }, [currentCompany?.id]);

  const fetchDashboardData = async () => {
    if (!currentCompany) return;
    setLoading(true);

    const [bookingsRes, roomsRes, guestsRes] = await Promise.all([
      supabase
        .from("bookings")
        .select("*, guests(full_name)")
        .eq("company_id", currentCompany.id)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("rooms")
        .select("type, status")
        .eq("company_id", currentCompany.id),
      supabase
        .from("guests")
        .select("id", { count: "exact", head: true })
        .eq("company_id", currentCompany.id),
    ]);

    // Recent bookings
    setRecentBookings(bookingsRes.data || []);

    // Room stats
    const rooms = roomsRes.data || [];
    setTotalRooms(rooms.length);
    setOccupiedRooms(rooms.filter((r) => r.status === "occupied").length);

    const typeMap = new Map<string, { total: number; occupied: number }>();
    rooms.forEach((r) => {
      const current = typeMap.get(r.type) || { total: 0, occupied: 0 };
      current.total++;
      if (r.status === "occupied") current.occupied++;
      typeMap.set(r.type, current);
    });
    setRoomStats(
      Array.from(typeMap.entries()).map(([type, stats]) => ({
        type,
        ...stats,
      }))
    );

    setTotalGuests(guestsRes.count || 0);
    setLoading(false);
  };

  const occupancyPct = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Welcome back. Here's your property overview.</p>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Rooms" value={String(totalRooms)} change={`${occupiedRooms} occupied`} changeType="neutral" icon={BedDouble} />
        <StatCard title="Room Occupancy" value={`${occupancyPct}%`} change={`${occupiedRooms} of ${totalRooms} rooms`} changeType={occupancyPct > 70 ? "positive" : "neutral"} icon={TrendingUp} />
        <StatCard title="Total Guests" value={String(totalGuests)} change="All time" changeType="neutral" icon={Users} />
        <StatCard title="Active Bookings" value={String(recentBookings.filter((b) => b.status === "active" || b.status === "confirmed").length)} change="Current" changeType="neutral" icon={CalendarDays} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={item} className="lg:col-span-2">
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Recent Bookings</CardTitle>
                <Badge variant="secondary" className="text-xs">{recentBookings.length} latest</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {recentBookings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bookings yet. Create your first booking!</p>
              ) : (
                <div className="space-y-1">
                  {recentBookings.map((booking) => {
                    const Icon = bookingTypeIcons[booking.booking_type] || CalendarDays;
                    return (
                      <div key={booking.id} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{booking.guests?.full_name || "Unknown Guest"}</p>
                            <p className="text-xs text-muted-foreground">{booking.details || booking.booking_type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold">${Number(booking.amount).toFixed(2)}</p>
                          <Badge variant={booking.status === "confirmed" || booking.status === "active" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {booking.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-display">Room Occupancy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {roomStats.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No rooms added yet</p>
              ) : (
                roomStats.map((room) => (
                  <div key={room.type} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{room.type}</span>
                      <span className="text-muted-foreground">{room.occupied}/{room.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${room.total > 0 ? (room.occupied / room.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
