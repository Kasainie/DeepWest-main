import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BedDouble, Wifi, Bath, Tv, Wind, Wine, Eye, Waves } from "lucide-react";

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

const amenityIcons: Record<string, React.ElementType> = {
  WiFi: Wifi,
  TV: Tv,
  Bath: Bath,
  "Air Conditioning": Wind,
  "Mini Bar": Wine,
  "Sea View": Eye,
  Shower: Waves,
};

interface RoomCardProps {
  room: Room;
  onClick: (room: Room) => void;
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  const displayAmenities = (room.amenities || []).slice(0, 4);

  return (
    <Card
      className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer group"
      onClick={() => onClick(room)}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-display">Room {room.room_number}</CardTitle>
          <Badge className={`${statusColors[room.status] || statusColors.available} text-[10px] border capitalize`}>
            {room.status}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{room.type} · Floor {room.floor}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <BedDouble className="h-3 w-3" /> {room.beds} bed{room.beds > 1 ? "s" : ""}
          </span>
          {displayAmenities.map((a) => {
            const Icon = amenityIcons[a] || Wifi;
            return (
              <span key={a} className="flex items-center gap-1">
                <Icon className="h-3 w-3" /> {a}
              </span>
            );
          })}
          {(room.amenities || []).length > 4 && (
            <span className="text-[10px]">+{room.amenities.length - 4} more</span>
          )}
        </div>
        <div className="flex items-center justify-between pt-1">
          <span className="text-lg font-bold font-display">KSh {Number(room.price_per_night).toLocaleString()}</span>
          <span className="text-[10px] text-muted-foreground">per night</span>
        </div>
      </CardContent>
    </Card>
  );
}

export type { Room };
