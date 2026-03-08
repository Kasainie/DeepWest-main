import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, CalendarDays, BedDouble } from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  booking_type: string;
  details: string | null;
  check_in: string | null;
  check_out: string | null;
  status: string;
  amount: number;
  created_at: string;
  rooms: { room_number: string } | null;
}

interface GuestHistoryDialogProps {
  guest: { id: string; full_name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  confirmed: "bg-primary/10 text-primary",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
  checked_out: "bg-muted text-muted-foreground",
};

export function GuestHistoryDialog({ guest, open, onOpenChange }: GuestHistoryDialogProps) {
  const { currentCompany } = useCompany();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && guest && currentCompany) {
      setLoading(true);
      supabase
        .from("bookings")
        .select("id, booking_type, details, check_in, check_out, status, amount, created_at, rooms(room_number)")
        .eq("company_id", currentCompany.id)
        .eq("guest_id", guest.id)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          setBookings((data || []) as unknown as Booking[]);
          setLoading(false);
        });
    }
  }, [open, guest?.id, currentCompany?.id]);

  const totalSpent = bookings.filter(b => b.status !== "cancelled").reduce((s, b) => s + Number(b.amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{guest?.full_name} — Booking History</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-8">
            <CalendarDays className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No booking history found</p>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            <div className="flex items-center justify-between text-sm px-1">
              <span className="text-muted-foreground">{bookings.length} booking{bookings.length !== 1 ? "s" : ""}</span>
              <span className="font-semibold">Total: KSh {totalSpent.toLocaleString()}</span>
            </div>
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/40 hover:bg-secondary/60 transition-colors">
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BedDouble className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium truncate">
                      {b.rooms?.room_number ? `Room ${b.rooms.room_number}` : b.details || b.booking_type}
                    </p>
                    <Badge className={`${statusStyles[b.status] || ""} text-[10px] border-0 shrink-0`}>{b.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {b.check_in ? format(new Date(b.check_in), "MMM d, yyyy") : "—"} → {b.check_out ? format(new Date(b.check_out), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <p className="text-sm font-semibold shrink-0">KSh {Number(b.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
