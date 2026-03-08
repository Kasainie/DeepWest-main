import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Eye, Edit, TrendingUp, Users, MousePointer } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";

const pages = [
  { name: "Home", path: "/", status: "published", lastEdited: "2 hours ago", views: "2,340" },
  { name: "Rooms & Suites", path: "/rooms", status: "published", lastEdited: "1 day ago", views: "1,820" },
  { name: "Dining", path: "/dining", status: "published", lastEdited: "3 days ago", views: "1,120" },
  { name: "Events & Weddings", path: "/events", status: "draft", lastEdited: "5 days ago", views: "890" },
  { name: "Gallery", path: "/gallery", status: "published", lastEdited: "1 week ago", views: "2,100" },
  { name: "Contact", path: "/contact", status: "published", lastEdited: "2 weeks ago", views: "780" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Website() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Website Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your public-facing website</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm"><Eye className="h-4 w-4 mr-1" /> Preview</Button>
          <Button size="sm"><Globe className="h-4 w-4 mr-1" /> Publish Changes</Button>
        </div>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Monthly Visitors" value="12,450" change="+18% this month" changeType="positive" icon={Users} />
        <StatCard title="Page Views" value="34,200" change="+22% vs last month" changeType="positive" icon={TrendingUp} />
        <StatCard title="Booking Clicks" value="1,840" change="5.4% conversion" changeType="positive" icon={MousePointer} />
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {pages.map((page) => (
                <div key={page.path} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center">
                      <Globe className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{page.name}</p>
                      <p className="text-xs text-muted-foreground">Last edited {page.lastEdited}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{page.views} views</span>
                    <Badge variant={page.status === "published" ? "default" : "secondary"} className="text-[10px]">
                      {page.status}
                    </Badge>
                    <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
