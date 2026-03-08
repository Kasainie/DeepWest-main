import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Plus, Star, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface Guest {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  id_number: string | null;
  is_vip: boolean;
  total_visits: number;
  total_spent: number;
  last_visit: string | null;
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Guests() {
  const { currentCompany } = useCompany();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", id_number: "", is_vip: false });

  useEffect(() => {
    if (currentCompany) fetchGuests();
  }, [currentCompany?.id]);

  const fetchGuests = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("guests")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("full_name");
    setGuests((data || []) as Guest[]);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { error } = await supabase.from("guests").insert({
      company_id: currentCompany.id,
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      id_number: form.id_number.trim() || null,
      is_vip: form.is_vip,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Guest added!");
      setForm({ full_name: "", email: "", phone: "", id_number: "", is_vip: false });
      setAddOpen(false);
      fetchGuests();
    }
    setSaving(false);
  };

  const filtered = guests.filter((g) => {
    const q = search.toLowerCase();
    return g.full_name.toLowerCase().includes(q) || (g.email || "").toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display">Guests</h1>
          <p className="text-sm text-muted-foreground mt-1">{guests.length} guest{guests.length !== 1 ? "s" : ""} total</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Guest</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add New Guest</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="John Smith" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@email.com" />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="+254 700 123456" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>ID Number</Label>
                  <Input value={form.id_number} onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))} placeholder="12345678" maxLength={30} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="john@email.com" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.is_vip} onCheckedChange={(v) => setForm((f) => ({ ...f, is_vip: v }))} />
                <Label>VIP Guest</Label>
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Guest
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>

      <motion.div variants={item} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search guests..." className="pl-9 bg-card border-0 shadow-soft" value={search} onChange={(e) => setSearch(e.target.value)} />
      </motion.div>

      {filtered.length === 0 ? (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardContent className="text-center py-12">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-display font-semibold mb-1">{guests.length === 0 ? "No guests yet" : "No matching guests"}</h3>
              <p className="text-sm text-muted-foreground">{guests.length === 0 ? "Add your first guest to get started" : "Try a different search term"}</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((guest) => (
            <Card key={guest.id} className="shadow-card border-0 hover:shadow-elevated transition-shadow cursor-pointer">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-sm font-semibold text-primary-foreground">
                      {guest.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{guest.full_name}</p>
                      <p className="text-xs text-muted-foreground">{guest.email || "No email"}</p>
                    </div>
                  </div>
                  {guest.is_vip && (
                    <Badge className="bg-warning/10 text-warning border-0 text-[10px]">
                      <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> VIP
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center bg-secondary/50 rounded-lg p-3">
                  <div>
                    <p className="text-lg font-bold font-display">{guest.total_visits}</p>
                    <p className="text-[10px] text-muted-foreground">Visits</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold font-display">${Number(guest.total_spent).toFixed(0)}</p>
                    <p className="text-[10px] text-muted-foreground">Total Spent</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium mt-1">{guest.last_visit ? new Date(guest.last_visit).toLocaleDateString() : "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Last Visit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}
