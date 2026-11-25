import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2, Building2, Lock, KeyRound, RefreshCw, Copy, Eye, EyeOff } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { motion } from "framer-motion";
import BrandingSettings from "@/components/settings/BrandingSettings";
import { uploadCompanyLogo, validateCompanyLogoFile } from "@/lib/companyLogo";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import type { Database } from "@/integrations/supabase/types";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.05 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function getErrorMessage(error: unknown, fallback: string) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message
  ) {
    return error.message;
  }
  return fallback;
}

export default function SettingsPage() {
  const { currentCompany, companyRole, refreshCompanies } = useCompany();
  const { user } = useAuth();
  const canEdit = companyRole === "owner" || companyRole === "admin";
  const { isSuperAdmin } = useSuperAdmin();

  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [staffCode, setStaffCode] = useState<string | null>(null);
  const [codeRevealed, setCodeRevealed] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    description: "",
  });

  useEffect(() => {
    if (currentCompany) {
      setForm({
        name: currentCompany.name || "",
        slug: currentCompany.slug || "",
        email: currentCompany.email || "",
        phone: currentCompany.phone || "",
        address: currentCompany.address || "",
        description: currentCompany.description || "",
      });
      setLogoPreview(currentCompany.logo_url);
      setRemoveLogo(false);
      setLogoFile(null);
      fetchStaffCode();
    }
  }, [currentCompany?.id]);

  const fetchStaffCode = async () => {
    if (!currentCompany || !user) return;
    const { data } = await supabase
      .from("company_staff")
      .select("staff_code")
      .eq("company_id", currentCompany.id)
      .eq("user_id", user.id)
      .single();
    setStaffCode(data?.staff_code || null);
  };

  const createAdminCode = async () => {
    if (!currentCompany || !user) return;
    setRegenerating(true);
    try {
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      const newCode = "ADM-" + Array.from(arr).map(b => b.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 8);
      const userName = user.user_metadata?.full_name || user.email || "Admin";
      const { error } = await supabase
        .from("company_staff")
        .insert({
          company_id: currentCompany.id,
          user_id: user.id,
          full_name: userName,
          role: "admin",
          department: ["restaurant", "kitchen", "accountant"],
          staff_code: newCode,
          is_active: true,
        });
      if (error) throw error;
      setStaffCode(newCode);
      setCodeRevealed(true);
      toast.success("Admin access code created!", { description: `Your code: ${newCode}` });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create code"));
    } finally {
      setRegenerating(false);
    }
  };

  const regenerateCode = async () => {
    if (!currentCompany || !user) return;
    setRegenerating(true);
    try {
      const arr = new Uint8Array(4);
      crypto.getRandomValues(arr);
      const newCode = "ADM-" + Array.from(arr).map(b => b.toString(36).padStart(2, '0')).join('').toUpperCase().slice(0, 8);
      const { error } = await supabase
        .from("company_staff")
        .update({ staff_code: newCode })
        .eq("company_id", currentCompany.id)
        .eq("user_id", user.id);
      if (error) throw error;
      setStaffCode(newCode);
      setCodeRevealed(true);
      toast.success("Access code regenerated!", { description: `New code: ${newCode}` });
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to regenerate code"));
    } finally {
      setRegenerating(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      validateCompanyLogoFile(file);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Invalid logo file"));
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCompany || !canEdit) return;
    setSaving(true);

    try {
      let logo_url = currentCompany.logo_url;

      if (removeLogo) {
        logo_url = null;
      } else if (logoFile) {
        const upload = await uploadCompanyLogo(logoFile, currentCompany.id);
        logo_url = upload.publicUrl;
      }

      const updateData: Database["public"]["Tables"]["companies"]["Update"] = {
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        description: form.description.trim() || null,
        logo_url,
      };

      // Only super admin can change company email
      if (isSuperAdmin) {
        updateData.email = form.email.trim() || null;
      }

      const { error } = await supabase
        .from("companies")
        .update(updateData)
        .eq("id", currentCompany.id);

      if (error) {
        if (error.code === "23505") {
          toast.error("This URL slug is already taken");
        } else {
          throw error;
        }
        return;
      }

      await refreshCompanies();
      toast.success("Settings saved!");
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to save"));
    } finally {
      setSaving(false);
    }
  };

  if (!currentCompany) return null;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-2xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold font-display">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your property</p>
      </motion.div>

      <motion.div variants={item}>
        <Card className="shadow-card border-0">
          <CardHeader>
            <CardTitle className="text-lg font-display">Company Logo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo"
                    className="h-20 w-20 rounded-xl object-cover border border-border"
                  />
                  {canEdit && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-20 w-20 rounded-xl bg-secondary flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              {canEdit && (
                <div>
                  <label className="inline-flex items-center gap-2 cursor-pointer text-sm font-medium text-primary hover:underline">
                    <Upload className="h-4 w-4" />
                    Upload new logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 2MB</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={item}>
        <form onSubmit={handleSave}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-display">Property Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  disabled={!canEdit}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Label>URL Slug</Label>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Hotel workspace URL</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="flex items-center gap-0">
                  <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground whitespace-nowrap">
                    deepwest/
                  </span>
                  <Input
                    value={form.slug}
                    disabled
                    className="rounded-l-none bg-muted/50 cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your URL slug cannot be changed after registration
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    disabled={!canEdit}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label>Email</Label>
                    {!isSuperAdmin && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Only super admin can change the company email</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    disabled={!isSuperAdmin}
                    placeholder="info@company.com"
                    className={!isSuperAdmin ? "bg-muted/50 cursor-not-allowed" : ""}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="123 Main St, City"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  disabled={!canEdit}
                  placeholder="Tell us about your property..."
                  rows={3}
                />
              </div>
              {canEdit && (
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </form>
      </motion.div>

      {/* Admin Access Code */}
      {canEdit && (
        <motion.div variants={item}>
          <Card className="shadow-card border-0">
            <CardHeader>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <KeyRound className="h-5 w-5" />
                Admin Access Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {staffCode ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    This is your staff login code. Use it to sign in via the Staff Code tab on the login page.
                  </p>
                  <div className="flex items-center gap-3">
                    <code className="flex-1 text-xl font-mono font-bold tracking-widest bg-muted px-4 py-2.5 rounded-lg">
                      {codeRevealed ? staffCode : "••••••••"}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setCodeRevealed(!codeRevealed)}
                      title={codeRevealed ? "Hide code" : "Reveal code"}
                    >
                      {codeRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(staffCode);
                        toast.success("Code copied!");
                      }}
                      title="Copy code"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={regenerateCode}
                    disabled={regenerating}
                    className="gap-1.5"
                  >
                    {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Regenerate Code
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Regenerating will invalidate your old code. You'll need to use the new one to log in.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    You don't have an admin access code for this company yet. Create one to enable Staff Code login.
                  </p>
                  <Button
                    onClick={createAdminCode}
                    disabled={regenerating}
                    className="gap-1.5"
                  >
                    {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
                    Create Admin Access Code
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <BrandingSettings />

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
