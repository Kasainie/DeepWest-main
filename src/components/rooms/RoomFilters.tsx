import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface RoomFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  typeFilter: string;
  onTypeChange: (v: string) => void;
  floorFilter: string;
  onFloorChange: (v: string) => void;
  floors: number[];
  types: string[];
}

export function RoomFilters({
  search, onSearchChange,
  statusFilter, onStatusChange,
  typeFilter, onTypeChange,
  floorFilter, onFloorChange,
  floors, types,
}: RoomFiltersProps) {
  return (
    <div className="flex flex-wrap gap-3">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search rooms..."
          className="pl-9"
        />
      </div>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="available">Available</SelectItem>
          <SelectItem value="occupied">Occupied</SelectItem>
          <SelectItem value="maintenance">Maintenance</SelectItem>
        </SelectContent>
      </Select>
      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          {types.map((t) => (
            <SelectItem key={t} value={t}>{t}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {floors.length > 1 && (
        <Select value={floorFilter} onValueChange={onFloorChange}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="Floor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Floors</SelectItem>
            {floors.map((f) => (
              <SelectItem key={f} value={String(f)}>Floor {f}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
