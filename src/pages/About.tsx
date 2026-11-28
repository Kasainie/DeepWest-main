import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
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
import { Building2, Phone, Mail, Send, Loader2, MessageSquarePlus, Clock, Inbox } from "lucide-react";
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
  company_id: string;
  user_id: string;
  subject: string;
  category: string;
  message: string;
  status: string;
  created_at: string;
  companyName: string;
}

export default function About() {
  const { user } = useAuth();
  const { currentCompany } = useCompany();
  const { isSuperAdmin, loading: checkingSuperAdmin } = useSuperAdmin();
  const [submitting, setSubmitting] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const [updatingTicketId, setUpdatingTicketId] = useState<string | null>(null);
  const [form, setForm] = useState({
    subject: "",
    category: "",
    message: "",
  });

  const fetchTickets = useCallback(async () => {
    if (!user || checkingSuperAdmin) return;
    setLoadingTickets(true);
    setTicketError(null);
    let query = supabase
      .from("support_tickets")
      .select("id, company_id, user_id, subject, category, message, status, created_at, updated_at, companies(name)")
      .order("created_at", { ascending: false })
      .limit(isSuperAdmin ? 100 : 10);
    if (!isSuperAdmin) query = query.eq("user_id", user.id);

    const { data, error } = await query;
    if (error) {
      setTickets([]);
      setTicketError(error.message);
      toast.error(`Couldn't load support tickets: ${error.message}`);
    } else {
      setTickets((data ?? []).map(({ companies, ...ticket }) => ({
        ...ticket,
        companyName: companies?.name ?? "Unknown hotel",
      })));
    }
    setLoadingTickets(false);
  }, [checkingSuperAdmin, isSuperAdmin, user]);

  useEffect(() => {
    void fetchTickets();
  }, [currentCompany?.id, fetchTickets]);

  const updateTicketStatus = async (ticket: Ticket, status: string) => {
    setUpdatingTicketId(ticket.id);
    const { data, error } = await supabase
      .from("support_tickets")
      .update({ status })
      .eq("id", ticket.id)
      .select("id, status")
      .single();
    if (error) {
      toast.error(`Couldn't update ticket: ${error.message}`);
    } else {
      setTickets((current) => current.map((entry) =>
        entry.id === ticket.id ? { ...entry, status: data.status } : entry,
      ));
      toast.success(`Ticket marked ${data.status.replace("_", " ")}`);
    }
    setUpdatingTicketId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !currentCompany) return;

    try {
      const parsed = ticketSchema.parse(form);
      setSubmitting(true);

      const { error } = await supabase.from("support_tickets").insert({
        company_id: currentCompany.id,
        user_id: user.id,
        subject: parsed.subject,
        category: parsed.category,
        message: parsed.message,
      });

      if (error) throw error;

      toast.success("Support ticket submitted successfully!");
      setForm({ subject: "", category: "", message: "" });
      await fetchTickets();
    } catch (err: unknown) {
      if (err instanceof z.ZodError) {
        toast.error(err.issues[0]?.message ?? "Invalid form details");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to submit ticket");
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
              {isSuperAdmin
                ? "Review and manage recent support requests from staff across DeepWest hotels below."
                : "For support, inquiries, or feature requests, please use the form below or contact us directly."}
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
      {!checkingSuperAdmin && !isSuperAdmin && <motion.div variants={item}>
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
      </motion.div>}

      {checkingSuperAdmin && (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardContent className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </CardContent>
          </Card>
        </motion.div>
      )}

      {isSuperAdmin && (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Inbox className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-display">Lktech Support Inbox</CardTitle>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Recent requests submitted across DeepWest hotels
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {!loadingTickets && !ticketError && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    ["Open", "open"],
                    ["In progress", "in_progress"],
                    ["Resolved", "resolved"],
                  ].map(([label, status]) => (
                    <div key={status} className="rounded-lg bg-muted/40 p-3 text-center">
                      <p className="text-lg font-semibold">
                        {tickets.filter((ticket) => ticket.status === status).length}
                      </p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
              )}
              {ticketError && <p role="alert" className="text-sm text-destructive">{ticketError}</p>}
              {loadingTickets ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : ticketError ? null : tickets.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No support requests have been submitted.</p>
              ) : (
                <div className="space-y-3">
                  {tickets.map((ticket) => (
                    <article key={ticket.id} className="space-y-3 rounded-lg border p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                          <h2 className="font-semibold">{ticket.subject}</h2>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline">{ticket.companyName}</Badge>
                            <Badge variant="secondary">
                              {CATEGORIES.find((category) => category.value === ticket.category)?.label ?? ticket.category}
                            </Badge>
                            <span>{format(new Date(ticket.created_at), "MMM d, yyyy")}</span>
                            <span>Account {ticket.user_id.slice(0, 8)}</span>
                          </div>
                        </div>
                        <div className="w-full sm:w-44">
                          <Select
                            value={ticket.status}
                            onValueChange={(status) => void updateTicketStatus(ticket, status)}
                            disabled={updatingTicketId === ticket.id}
                          >
                            <SelectTrigger aria-label={`Update status for ${ticket.subject}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="open">Open</SelectItem>
                              <SelectItem value="in_progress">In progress</SelectItem>
                              <SelectItem value="resolved">Resolved</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap break-words rounded-md bg-muted/30 p-3 text-sm">
                        {ticket.message}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Previous Tickets */}
      {!checkingSuperAdmin && !isSuperAdmin && <motion.div variants={item}>
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
      </motion.div>}
    </motion.div>
  );
}
