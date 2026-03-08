import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PageData {
  id?: string;
  title: string;
  slug: string;
  content: string;
  meta_title: string;
  meta_description: string;
  status: string;
}

interface PageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: PageData | null;
  onSave: (data: Omit<PageData, "id">) => void;
  isSaving: boolean;
}

export function PageDialog({ open, onOpenChange, page, onSave, isSaving }: PageDialogProps) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [status, setStatus] = useState("draft");

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content);
      setMetaTitle(page.meta_title);
      setMetaDescription(page.meta_description);
      setStatus(page.status);
    } else {
      setTitle("");
      setSlug("");
      setContent("");
      setMetaTitle("");
      setMetaDescription("");
      setStatus("draft");
    }
  }, [page, open]);

  const generateSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!page) setSlug(generateSlug(val));
  };

  const handleSave = () => {
    onSave({ title, slug, content, meta_title: metaTitle, meta_description: metaDescription, status });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{page ? "Edit Page" : "Create New Page"}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="content" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="content" className="flex-1">Content</TabsTrigger>
            <TabsTrigger value="seo" className="flex-1">SEO</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Page Title</Label>
              <Input value={title} onChange={(e) => handleTitleChange(e.target.value)} placeholder="e.g. About Us" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">/</span>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="about-us" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Page content..." rows={8} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="seo" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Meta Title</Label>
              <Input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO title (max 60 chars)" maxLength={60} />
              <p className="text-xs text-muted-foreground">{metaTitle.length}/60 characters</p>
            </div>
            <div className="space-y-2">
              <Label>Meta Description</Label>
              <Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO description (max 160 chars)" maxLength={160} rows={3} />
              <p className="text-xs text-muted-foreground">{metaDescription.length}/160 characters</p>
            </div>
            <div className="rounded-lg border p-4 bg-secondary/30">
              <p className="text-xs text-muted-foreground mb-1">Search Preview</p>
              <p className="text-sm font-medium text-primary truncate">{metaTitle || title || "Page Title"}</p>
              <p className="text-xs text-success truncate">yoursite.com/{slug || "page-slug"}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{metaDescription || "No description set."}</p>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!title.trim() || !slug.trim() || isSaving}>
            {isSaving ? "Saving..." : page ? "Update Page" : "Create Page"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
