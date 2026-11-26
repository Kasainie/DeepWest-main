import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Phone, Mail, Send, Loader2, MessageSquarePlus, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { z } from "zod";
import { format } from "date-fns";

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(150, "Subject must be under 150 characters"),
  category: z.string().min(1, "Please select a category"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be under 2000 characters"),
});

const CATEGORIES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature", label: "Feature Request" },
  { value: "billing", label: "Billing" },
  { value: "general", label: "General Inquiry" },
];

const STATUS_COLORS: Record<string, "default" | "secondary" | "destructive"> = {
  open: "default",
  in_progress: "secondary",
  resolved: "secondary",
};

interface Ticket {
  id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
}

export default function About() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [form, setForm] = useState({
    subject: "",
    category: "",
    message: "",
  });

  useEffect(() => {
    fetchTickets();
  }, [currentCompany?.id]);

  const fetchTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    const { data } = await supabase
      .from("support_tickets" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setTickets((data as unknown as Ticket[]) || []);
    setLoadingTickets(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentCompany) return;

    try {
      const parsed = ticketSchema.parse(form);
      setSubmitting(true);

      const { error } = await supabase.from("support_tickets" as any).insert({
        company_id: currentCompany.id,
        user_id: user.id,
        subject: parsed.subject,
        category: parsed.category,
        message: parsed.message,
      } as any);

      if (error) throw error;

      toast.success("Support ticket submitted successfully!");
      setForm({ subject: "", category: "", message: "" });
      fetchTickets();
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Invalid form details");
      } else {
        toast.error(err.message || "Failed to submit ticket");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">About</h1>
        <p className="text-sm text-muted-foreground mt-1">System information & support</p>
      </motion.div>

      {/* System Provider Card */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
                <Building2 className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-xl font-display">DeepWest</CardTitle>
                <p className="text-sm text-muted-foreground">Developed by Lktech</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground leading-relaxed">
              For support, inquiries, or feature requests, please use the form below or contact us directly.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Phone className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <a
                    href="tel:+254795872528"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    0795872528
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href="mailto:info@lktech.life"
                    className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                  >
                    info@lktech.life
                  </a>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                © {new Date().getFullYear()} Lktech. All rights reserved.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Support Ticket Form */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Submit a Support Ticket</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Describe your issue or request and we'll get back to you
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Brief description of your issue"
                  maxLength={150}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Describe the issue in detail..."
                  rows={4}
                  maxLength={2000}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {form.message.length}/2000
                </p>
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Ticket
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Previous Tickets */}
      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-display">Your Tickets</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">Recent support requests</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingTickets ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : tickets.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No tickets submitted yet
              </p>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{ticket.subject}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {CATEGORIES.find((c) => c.value === ticket.category)?.label || ticket.category}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(ticket.created_at), "MMM d, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={STATUS_COLORS[ticket.status] || "secondary"}
                      className="text-[10px] px-1.5 py-0 ml-2 shrink-0"
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
