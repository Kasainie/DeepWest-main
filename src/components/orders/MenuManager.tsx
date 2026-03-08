import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string | null;
  is_available: boolean;
}

const categories = ["starter", "main", "side", "dessert", "drink"];

interface MenuManagerProps {
  onMenuChange?: () => void;
}

export function MenuManager({ onMenuChange }: MenuManagerProps) {
  const { currentCompany } = useCompany();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", category: "main", price: "", description: "" });

  useEffect(() => {
    if (currentCompany) fetchItems();
  }, [currentCompany?.id]);

  const fetchItems = async () => {
    if (!currentCompany) return;
    setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("*")
      .eq("company_id", currentCompany.id)
      .order("category");
    setItems((data || []) as MenuItem[]);
    setLoading(false);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany) return;
    setSaving(true);

    const { error } = await supabase.from("menu_items").insert({
      company_id: currentCompany.id,
      name: form.name.trim(),
      category: form.category,
      price: parseFloat(form.price) || 0,
      description: form.description.trim() || null,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Menu item added!");
      setForm({ name: "", category: "main", price: "", description: "" });
      setAddOpen(false);
      fetchItems();
      onMenuChange?.();
    }
    setSaving(false);
  };

  const toggleAvailability = async (item: MenuItem) => {
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !item.is_available })
      .eq("id", item.id);
    if (!error) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, is_available: !i.is_available } : i)));
      onMenuChange?.();
    }
  };

  const deleteItem = async (id: string) => {
    const { error } = await supabase.from("menu_items").delete().eq("id", id);
    if (!error) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast.success("Item removed");
      onMenuChange?.();
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{items.length} menu items</p>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add Menu Item</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Grilled Salmon" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price ($)</Label>
                  <Input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} placeholder="12.99" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional description" />
              </div>
              <Button type="submit" className="w-full" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Item
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {items.length === 0 ? (
        <Card className="shadow-card border-0">
          <CardContent className="text-center py-12">
            <p className="text-sm text-muted-foreground">No menu items yet. Add your first item!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {items.map((mi) => (
            <div
              key={mi.id}
              className={`flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors ${!mi.is_available ? "opacity-50" : ""}`}
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{mi.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="secondary" className="text-[10px] capitalize">{mi.category}</Badge>
                  <span className="text-xs font-bold">${Number(mi.price).toFixed(2)}</span>
                  {mi.description && <span className="text-[10px] text-muted-foreground truncate">{mi.description}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 ml-2">
                <Switch checked={mi.is_available} onCheckedChange={() => toggleAvailability(mi)} className="scale-75" />
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteItem(mi.id)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
