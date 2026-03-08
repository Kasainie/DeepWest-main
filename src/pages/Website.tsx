import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Globe, Eye, Edit, TrendingUp, Users, MousePointer, Plus, Trash2, Search, FileText, ArrowUpDown,
} from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { motion } from "framer-motion";
import { useCompany } from "@/contexts/CompanyContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { PageDialog } from "@/components/website/PageDialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function Website() {
  const { company } = useCompany();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ["website-pages", company?.id],
    queryFn: async () => {
      if (!company?.id) return [];
      const { data, error } = await supabase
        .from("website_pages")
        .select("*")
        .eq("company_id", company.id)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!company?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async (pageData: any) => {
      if (editingPage?.id) {
        const { error } = await supabase
          .from("website_pages")
          .update({ ...pageData, updated_at: new Date().toISOString() })
          .eq("id", editingPage.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("website_pages")
          .insert({ ...pageData, company_id: company!.id, sort_order: pages.length });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-pages"] });
      setDialogOpen(false);
      setEditingPage(null);
      toast.success(editingPage ? "Page updated" : "Page created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("website_pages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-pages"] });
      setDeleteId(null);
      toast.success("Page deleted");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const toggleStatus = useMutation({
    mutationFn: async (page: any) => {
      const newStatus = page.status === "published" ? "draft" : "published";
      const { error } = await supabase
        .from("website_pages")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", page.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["website-pages"] });
      toast.success("Status updated");
    },
  });

  const filtered = pages.filter((p: any) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const publishedCount = pages.filter((p: any) => p.status === "published").length;
  const draftCount = pages.filter((p: any) => p.status === "draft").length;
  const totalViews = pages.reduce((sum: number, p: any) => sum + (p.views || 0), 0);

  const openEdit = (page: any) => {
    setEditingPage({
      id: page.id,
      title: page.title,
      slug: page.slug,
      content: page.content || "",
      meta_title: page.meta_title || "",
      meta_description: page.meta_description || "",
      status: page.status,
    });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingPage(null);
    setDialogOpen(true);
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={item} className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-display">Website Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your public-facing website pages & SEO</p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Page
        </Button>
      </motion.div>

      <motion.div variants={item} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Pages" value={pages.length} change={`${publishedCount} published`} changeType="positive" icon={FileText} />
        <StatCard title="Draft Pages" value={draftCount} change="Awaiting publish" changeType="neutral" icon={Edit} />
        <StatCard title="Total Views" value={totalViews.toLocaleString()} change="All time" changeType="positive" icon={TrendingUp} />
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <CardTitle className="text-lg font-display">Pages</CardTitle>
            <div className="relative w-56">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search pages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-12 text-center text-muted-foreground text-sm">Loading pages...</div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center">
                <Globe className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {pages.length === 0 ? "No pages yet. Create your first page!" : "No pages match your search."}
                </p>
                {pages.length === 0 && (
                  <Button variant="outline" size="sm" className="mt-3" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" /> Create Page
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filtered.map((page: any) => (
                  <div
                    key={page.id}
                    className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-secondary/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Globe className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{page.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          /{page.slug} · Updated {format(new Date(page.updated_at), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">{page.views} views</span>
                      <Badge
                        variant={page.status === "published" ? "default" : "secondary"}
                        className="text-[10px] cursor-pointer"
                        onClick={() => toggleStatus.mutate(page)}
                      >
                        {page.status}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEdit(page)}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                        onClick={() => setDeleteId(page.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <PageDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        page={editingPage}
        onSave={(data) => saveMutation.mutate(data)}
        isSaving={saveMutation.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Page</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this page. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
