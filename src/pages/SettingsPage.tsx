import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { motion } from "framer-motion";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your property</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Property Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Property Name</Label>
              <Input defaultValue="Grand Vista Hotel & Resort" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input defaultValue="+1 (555) 123-4567" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input defaultValue="info@grandvista.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input defaultValue="123 Ocean Drive, Miami Beach, FL 33139" />
            </div>
            <Button size="sm">Save Changes</Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Notifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "New booking alerts", description: "Get notified for new reservations", default: true },
              { label: "Check-in reminders", description: "Daily check-in summary at 6 AM", default: true },
              { label: "Revenue reports", description: "Weekly revenue summary", default: false },
              { label: "Guest feedback", description: "Instant alerts for guest reviews", default: true },
            ].map((n) => (
              <div key={n.label} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{n.label}</p>
                  <p className="text-xs text-muted-foreground">{n.description}</p>
                </div>
                <Switch defaultChecked={n.default} />
              </div>
            ))}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
