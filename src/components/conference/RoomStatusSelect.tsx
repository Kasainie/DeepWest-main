import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = [
  { value: "available", label: "Available" },
  { value: "occupied", label: "Occupied" },
  { value: "reserved", label: "Reserved" },
  { value: "maintenance", label: "Maintenance" },
];

interface Props {
  roomId: string;
  currentStatus: string;
  onUpdated: () => void;
}

export function RoomStatusSelect({ roomId, currentStatus, onUpdated }: Props) {
  const handleChange = async (newStatus: string) => {
    const { error } = await supabase
      .from("conference_rooms")
      .update({ status: newStatus })
      .eq("id", roomId);
    if (error) {
      toast.error("Failed to update status");
      return;
    }
    toast.success(`Status updated to ${newStatus}`);
    onUpdated();
  };

  return (
    <Select value={currentStatus} onValueChange={handleChange}>
      <SelectTrigger className="h-7 text-xs w-[110px]">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
