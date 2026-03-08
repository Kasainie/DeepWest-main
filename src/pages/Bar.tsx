import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Wine, Beer, Coffee, Martini } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { Users, TrendingUp } from "lucide-react";
import { KshIcon } from "@/components/KshIcon";
import { motion } from "framer-motion";

const tabs = [
  { id: 1, name: "Bar Counter", seats: 8, occupied: 5 },
  { id: 2, name: "Lounge Area", seats: 20, occupied: 14 },
  { id: 3, name: "VIP Section", seats: 12, occupied: 8 },
  { id: 4, name: "Rooftop Terrace", seats: 30, occupied: 22 },
];

const popularDrinks = [
  { name: "Old Fashioned", category: "Cocktail", price: "KSh 1,600", orders: 42, icon: Martini },
  { name: "Craft IPA", category: "Beer", price: "KSh 900", orders: 38, icon: Beer },
  { name: "Espresso Martini", category: "Cocktail", price: "KSh 1,800", orders: 35, icon: Coffee },
  { name: "House Red Wine", category: "Wine", price: "KSh 1,400", orders: 28, icon: Wine },
  { name: "Mojito", category: "Cocktail", price: "KSh 1,500", orders: 24, icon: Martini },
];

const activeOrders = [
  { table: "Bar 3", items: "2x Old Fashioned, 1x Beer", time: "2 min ago", total: "KSh 4,100" },
  { table: "VIP 2", items: "1x Champagne Bottle", time: "5 min ago", total: "KSh 18,000" },
  { table: "Lounge 4", items: "3x Wine, 2x Cocktail", time: "8 min ago", total: "KSh 7,200" },
  { table: "Terrace 7", items: "4x Beer, 1x Nachos", time: "12 min ago", total: "KSh 5,600" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Bar() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Bar & Lounge</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage bar areas, orders, and inventory</p>
        </div>
        <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Order</Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Bar Revenue" value="KSh 384,000" change="+15%" changeType="positive" iconNode={<KshIcon className="h-5 w-5 text-primary" />} />
        <StatCard title="Active Guests" value="49" change="70% capacity" changeType="neutral" icon={Users} />
        <StatCard title="Avg Check" value="KSh 2,850" change="+KSh 320" changeType="positive" icon={TrendingUp} />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-display">Bar Areas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tabs.map((area) => (
                <div key={area.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                  <div>
                    <p className="text-sm font-medium">{area.name}</p>
                    <p className="text-xs text-muted-foreground">{area.seats} seats</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(area.occupied / area.seats) * 100}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-12 text-right">{Math.round((area.occupied / area.seats) * 100)}%</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-display">Popular Drinks</CardTitle>
                <Badge variant="secondary">Tonight</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {popularDrinks.map((drink, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                      <drink.icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{drink.name}</p>
                      <p className="text-xs text-muted-foreground">{drink.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{drink.price}</p>
                    <p className="text-xs text-muted-foreground">{drink.orders} orders</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Active Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {activeOrders.map((order, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{order.table}</p>
                    <p className="text-xs text-muted-foreground">{order.items}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{order.total}</p>
                    <p className="text-xs text-muted-foreground">{order.time}</p>
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
