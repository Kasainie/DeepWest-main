import { useEffect, useMemo, useState } from "react";
import { format, subDays, subMonths, startOfMonth } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface DateRange {
  from: Date;
  to: Date;
}

const PRESETS: { label: string; value: string; range: () => DateRange }[] = [
  { label: "Today", value: "today", range: () => ({ from: new Date(), to: new Date() }) },
  { label: "Last 7 days", value: "7d", range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: "Last 14 days", value: "14d", range: () => ({ from: subDays(new Date(), 13), to: new Date() }) },
  { label: "Last 30 days", value: "30d", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { label: "This month", value: "month", range: () => ({ from: startOfMonth(new Date()), to: new Date() }) },
  { label: "Last 3 months", value: "3m", range: () => ({ from: subMonths(new Date(), 3), to: new Date() }) },
  { label: "Last 6 months", value: "6m", range: () => ({ from: subMonths(new Date(), 6), to: new Date() }) },
  { label: "Custom", value: "custom", range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
];

interface DateRangeFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const toLocalDateKey = (date: Date) => format(date, "yyyy-MM-dd");

const resolvePresetFromRange = (range: DateRange): string => {
  const fromKey = toLocalDateKey(range.from);
  const toKey = toLocalDateKey(range.to);

  const matched = PRESETS.find((preset) => {
    if (preset.value === "custom") return false;
    const presetRange = preset.range();
    return toLocalDateKey(presetRange.from) === fromKey && toLocalDateKey(presetRange.to) === toKey;
  });

  return matched?.value ?? "custom";
};

export function DateRangeFilter({ dateRange, onDateRangeChange }: DateRangeFilterProps) {
  const computedPreset = useMemo(() => resolvePresetFromRange(dateRange), [dateRange]);
  const [preset, setPreset] = useState(computedPreset);
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);

  useEffect(() => {
    setPreset((prev) => (prev === computedPreset ? prev : computedPreset));
  }, [computedPreset]);

  const handlePreset = (value: string) => {
    setPreset(value);
    if (value !== "custom") {
      const p = PRESETS.find((entry) => entry.value === value);
      if (p) onDateRangeChange(p.range());
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger className="w-[150px] h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRESETS.map((p) => (
            <SelectItem key={p.value} value={p.value} className="text-xs">
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <>
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <CalendarIcon className="h-3 w-3" />
                {format(dateRange.from, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(d) => {
                  if (d) {
                    onDateRangeChange({ ...dateRange, from: d });
                    setFromOpen(false);
                  }
                }}
                disabled={(d) => d > dateRange.to}
                autoFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
          <span className="text-xs text-muted-foreground">to</span>
          <Popover open={toOpen} onOpenChange={setToOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <CalendarIcon className="h-3 w-3" />
                {format(dateRange.to, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(d) => {
                  if (d) {
                    onDateRangeChange({ ...dateRange, to: d });
                    setToOpen(false);
                  }
                }}
                disabled={(d) => d < dateRange.from || d > new Date()}
                autoFocus
                className={cn("p-3 pointer-events-auto")}
              />
            </PopoverContent>
          </Popover>
        </>
      )}
    </div>
  );
}

