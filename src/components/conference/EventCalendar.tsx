import { useMemo, useState, forwardRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isWithinInterval } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Booking {
  id: string;
  event_name: string;
  event_date: string;
  end_date: string | null;
  status: string;
  room_name?: string;
}

interface Props {
  bookings: Booking[];
}

const statusDot: Record<string, string> = {
  confirmed: "bg-success",
  pending: "bg-warning",
  cancelled: "bg-destructive",
};

export const EventCalendar = forwardRef<HTMLDivElement, Props>(({ bookings }, ref) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startDayOfWeek = days[0].getDay();

  const getEventsForDay = (day: Date) =>
    bookings.filter((b) => {
      const eventStart = parseISO(b.event_date);
      const eventEnd = b.end_date ? parseISO(b.end_date) : eventStart;
      return isSameDay(day, eventStart) || isSameDay(day, eventEnd) || isWithinInterval(day, { start: eventStart, end: eventEnd });
    });

  return (
    <Card className="shadow-card border-0">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-display">Event Calendar</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="text-[10px] font-medium text-muted-foreground text-center py-1.5">{d}</div>
          ))}
          {Array.from({ length: startDayOfWeek }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map((day) => {
            const events = getEventsForDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[72px] p-1 rounded-md border transition-colors ${
                  isToday ? "border-primary bg-primary/5" : "border-transparent hover:bg-secondary/50"
                }`}
              >
                <span className={`text-[11px] font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </span>
                <div className="mt-0.5 space-y-0.5">
                  {events.slice(0, 2).map((e) => (
                    <div key={e.id} className="flex items-center gap-1">
                      <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${statusDot[e.status] || "bg-muted-foreground"}`} />
                      <span className="text-[9px] truncate text-muted-foreground">{e.event_name}</span>
                    </div>
                  ))}
                  {events.length > 2 && (
                    <span className="text-[9px] text-muted-foreground">+{events.length - 2} more</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
