import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Filter, Download } from "lucide-react";
import { motion } from "framer-motion";

const bookings = [
  { id: "B-1024", guest: "James Anderson", email: "james@email.com", type: "Room", details: "Deluxe Suite #101 · 3 nights", checkIn: "Mar 8", checkOut: "Mar 11", status: "active", amount: "$1,050" },
  { id: "B-1025", guest: "Sarah Mitchell", email: "sarah@email.com", type: "Restaurant", details: "Table for 6 · Mar 8 8PM", checkIn: "Mar 8", checkOut: "-", status: "confirmed", amount: "$320" },
  { id: "B-1026", guest: "Robert Chen", email: "robert@email.com", type: "Conference", details: "Grand Ballroom · 2 days", checkIn: "Mar 15", checkOut: "Mar 16", status: "confirmed", amount: "$5,000" },
  { id: "B-1027", guest: "Emily Davis", email: "emily@email.com", type: "Room", details: "Ocean View #201 · 5 nights", checkIn: "Mar 9", checkOut: "Mar 14", status: "active", amount: "$1,250" },
  { id: "B-1028", guest: "Michael Brown", email: "michael@email.com", type: "Bar", details: "VIP Lounge · Mar 10 9PM", checkIn: "Mar 10", checkOut: "-", status: "pending", amount: "$450" },
  { id: "B-1029", guest: "Lisa Wong", email: "lisa@email.com", type: "Room", details: "Deluxe Suite #102 · 2 nights", checkIn: "Mar 8", checkOut: "Mar 10", status: "active", amount: "$700" },
  { id: "B-1030", guest: "David Kim", email: "david@email.com", type: "Conference", details: "Innovation Lab · 1 day", checkIn: "Mar 12", checkOut: "Mar 12", status: "confirmed", amount: "$1,200" },
  { id: "B-1031", guest: "Anna Kowalski", email: "anna@email.com", type: "Restaurant", details: "Table for 2 · Mar 9 7PM", checkIn: "Mar 9", checkOut: "-", status: "cancelled", amount: "$0" },
];

const statusStyles: Record<string, string> = {
  active: "bg-success/10 text-success",
  confirmed: "bg-info/10 text-info",
  pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive",
};

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.04 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Bookings() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">All Bookings</h1>
          <p className="text-sm text-muted-foreground mt-1">Track and manage all reservations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-1" /> Export</Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search bookings..." className="pl-9 bg-card border-0 shadow-soft" />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-1" /> Filter</Button>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0 overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-secondary/30">
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">ID</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Guest</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden md:table-cell">Details</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3 hidden lg:table-cell">Dates</th>
                    <th className="text-left text-xs font-medium text-muted-foreground p-3">Status</th>
                    <th className="text-right text-xs font-medium text-muted-foreground p-3">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-b last:border-0 hover:bg-secondary/20 transition-colors cursor-pointer">
                      <td className="p-3 text-sm font-mono text-muted-foreground">{b.id}</td>
                      <td className="p-3">
                        <p className="text-sm font-medium">{b.guest}</p>
                        <p className="text-xs text-muted-foreground">{b.email}</p>
                      </td>
                      <td className="p-3"><Badge variant="secondary" className="text-[10px]">{b.type}</Badge></td>
                      <td className="p-3 text-sm text-muted-foreground hidden md:table-cell">{b.details}</td>
                      <td className="p-3 text-sm text-muted-foreground hidden lg:table-cell">{b.checkIn} → {b.checkOut}</td>
                      <td className="p-3">
                        <Badge className={`${statusStyles[b.status]} text-[10px] border-0`}>{b.status}</Badge>
                      </td>
                      <td className="p-3 text-sm font-semibold text-right">{b.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
