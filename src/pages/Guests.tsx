import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, Star } from "lucide-react";
import { motion } from "framer-motion";

const guests = [
  { name: "James Anderson", email: "james@email.com", visits: 12, lastVisit: "Mar 8, 2026", totalSpent: "$14,200", vip: true },
  { name: "Sarah Mitchell", email: "sarah@email.com", visits: 5, lastVisit: "Mar 8, 2026", totalSpent: "$4,800", vip: false },
  { name: "Robert Chen", email: "robert@email.com", visits: 8, lastVisit: "Mar 7, 2026", totalSpent: "$9,600", vip: true },
  { name: "Emily Davis", email: "emily@email.com", visits: 3, lastVisit: "Mar 9, 2026", totalSpent: "$3,100", vip: false },
  { name: "Michael Brown", email: "michael@email.com", visits: 15, lastVisit: "Mar 6, 2026", totalSpent: "$18,500", vip: true },
  { name: "Lisa Wong", email: "lisa@email.com", visits: 6, lastVisit: "Mar 8, 2026", totalSpent: "$5,400", vip: false },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Guests() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Guests</h1>
          <p className="text-sm text-muted-foreground mt-1">Guest profiles and history</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Guest</Button>
      </motion.div>

      <motion.div variants={item} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search guests..." className="pl-9 bg-card border-0 shadow-soft" />
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {guests.map((guest) => (
          <Card key={guest.email} className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                    {guest.name.split(" ").map(n => n[0]).join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{guest.name}</p>
                    <p className="text-xs text-muted-foreground">{guest.email}</p>
                  </div>
                </div>
                {guest.vip && (
                  <Badge className="bg-warning/10 text-warning border-0 text-[10px]">
                    <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> VIP
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center bg-secondary/50 rounded-lg p-3">
                <div>
                  <p className="text-lg font-bold font-display">{guest.visits}</p>
                  <p className="text-[10px] text-muted-foreground">Visits</p>
                </div>
                <div>
                  <p className="text-lg font-bold font-display">{guest.totalSpent}</p>
                  <p className="text-[10px] text-muted-foreground">Total Spent</p>
                </div>
                <div>
                  <p className="text-xs font-medium mt-1">{guest.lastVisit}</p>
                  <p className="text-[10px] text-muted-foreground">Last Visit</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>
    </motion.div>
  );
}
