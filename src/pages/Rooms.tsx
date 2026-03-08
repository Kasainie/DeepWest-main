import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BedDouble, DoorOpen, Users } from "lucide-react";
import { motion } from "framer-motion";
import { StatCard } from "@/components/StatCard";
import { KshIcon } from "@/components/KshIcon";
import { AddRoomDialog } from "@/components/rooms/AddRoomDialog";
import { RoomFilters } from "@/components/rooms/RoomFilters";
import { RoomCard, type Room } from "@/components/rooms/RoomCard";
import { RoomDetailsDialog } from "@/components/rooms/RoomDetailsDialog";
import { AssignRoomDialog } from "@/components/rooms/AssignRoomDialog";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Rooms() {
  const { currentCompany } = useCompany();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [floorFilter, setFloorFilter] = useState("all");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignRoom, setAssignRoom] = useState<Room | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  useEffect(() => {
    if (currentCompany) fetchRooms();
  }, [currentCompany?.id]);

  const fetchRooms = async () => {
    if (!currentCompany) return;
    const isInitial = rooms.length === 0;
    if (isInitial) setLoading(true);
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("room_number");
    setRooms((data || []) as Room[]);
    setLoading(false);
  };

  const floors = useMemo(() => [...new Set(rooms.map((r) => r.floor))].sort((a, b) => a - b), [rooms]);
  const types = useMemo(() => [...new Set(rooms.map((r) => r.type))].sort(), [rooms]);

  const filtered = useMemo(() => {
    return rooms.filter((r) => {
      if (search && !r.room_number.toLowerCase().includes(search.toLowerCase()) && !r.type.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (floorFilter !== "all" && r.floor !== parseInt(floorFilter)) return false;
      return true;
    });
  }, [rooms, search, statusFilter, typeFilter, floorFilter]);

  const handleRoomClick = (room: Room) => {
    setSelectedRoom(room);
    setDetailsOpen(true);
  };

  const showInlineLoader = loading && rooms.length === 0;

  const totalRooms = rooms.length;
  const occupiedRooms = rooms.filter((r) => r.status === "occupied").length;
  const availableRooms = rooms.filter((r) => r.status === "available").length;
  const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
  const avgPrice = totalRooms > 0 ? Math.round(rooms.reduce((s, r) => s + Number(r.price_per_night), 0) / totalRooms) : 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {rooms.length} room{rooms.length !== 1 ? "s" : ""} total
          </p>
        </div>
        {currentCompany && <AddRoomDialog companyId={currentCompany.id} onAdded={fetchRooms} />}
      </motion.div>

      {showInlineLoader ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (<>
      <motion.div variants={item} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard title="Occupancy" value={`${occupancyRate}%`} change={`${occupiedRooms} of ${totalRooms}`} changeType={occupancyRate > 80 ? "positive" : "neutral"} icon={Users} />
        <StatCard title="Available" value={availableRooms} change="Rooms" changeType="positive" icon={DoorOpen} />
        <StatCard title="Occupied" value={occupiedRooms} change="Rooms" changeType="neutral" icon={BedDouble} />
        <StatCard title="Avg Price" value={`KSh ${avgPrice.toLocaleString()}`} change="Per night" changeType="neutral" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
      </motion.div>

      {rooms.length > 0 && (
        <motion.div variants={item}>
          <RoomFilters
            search={search} onSearchChange={setSearch}
            statusFilter={statusFilter} onStatusChange={setStatusFilter}
            typeFilter={typeFilter} onTypeChange={setTypeFilter}
            floorFilter={floorFilter} onFloorChange={setFloorFilter}
            floors={floors} types={types}
          />
        </motion.div>
      )}

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
      ) : filtered.length === 0 ? (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardContent className="text-center py-12">
              <p className="text-sm text-muted-foreground">No rooms match your filters</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((room) => (
            <RoomCard key={room.id} room={room} onClick={handleRoomClick} />
          ))}
        </motion.div>
      )}

      <RoomDetailsDialog
        room={selectedRoom}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdated={fetchRooms}
        onAssignRoom={(room) => {
          setAssignRoom(room);
          setAssignOpen(true);
        }}
      />

      {currentCompany && (
        <AssignRoomDialog
          room={assignRoom}
          open={assignOpen}
          onOpenChange={setAssignOpen}
          companyId={currentCompany.id}
          onAssigned={fetchRooms}
        />
      )}
      </>
      )}
  );
}
