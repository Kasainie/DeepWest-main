import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";

const companySchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  phone: z.string().trim().min(7, "Phone number must be at least 7 digits").max(30, "Phone number too long"),
  address: z.string().trim().max(255).optional().or(z.literal("")),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  switchPassword: z.string().min(4, "Password must be at least 4 characters").max(50),
});

export default function RegisterCompany() {
  const { user } = useAuth();
  const { refreshCompanies } = useCompany();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    email: "",
    phone: "",
    address: "",
    description: "",
    switchPassword: "",
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo must be under 2MB");
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 50);
    setForm((f) => ({ ...f, name, slug }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const parsed = companySchema.parse(form);

      let logo_url: string | null = null;
      if (logoFile) {
        try {
          const ext = logoFile.name.split(".").pop();
          const path = `${user.id}/${Date.now()}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("company-logos")
            .upload(path, logoFile, { upsert: true });
          if (uploadError) {
            console.warn("Logo upload failed, continuing without logo:", uploadError);
            toast.warning("Logo upload failed, but company will be created without it.");
          } else {
            const { data: urlData } = supabase.storage
              .from("company-logos")
              .getPublicUrl(path);
            logo_url = urlData.publicUrl;
          }
        } catch (uploadErr) {
          console.warn("Logo upload error:", uploadErr);
          toast.warning("Logo upload failed, continuing without logo.");
        }
      }

      const { data: company, error } = await supabase.rpc("create_company_with_owner", {
        _name: parsed.name,
        _slug: parsed.slug,
        _email: parsed.email || null,
        _phone: parsed.phone || null,
        _address: parsed.address || null,
        _description: parsed.description || null,
        _logo_url: logo_url,
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("This company URL slug is already taken");
        } else {
          throw error;
        }
        return;
      }

      if (!company) {
        toast.error("Registration failed");
        return;
      }

      // Fetch the generated admin staff code
      let adminCode = "";
      const { data: staffRecord } = await supabase
        .from("company_staff")
        .select("staff_code")
        .eq("company_id", company.id)
        .eq("user_id", user.id)
        .single();
      if (staffRecord) {
        adminCode = staffRecord.staff_code;
      }

      // Send admin access code email via edge function
      if (adminCode) {
        supabase.functions.invoke("send-admin-code", {
          body: { company_id: company.id },
        }).catch((err) => console.warn("Failed to send admin code email:", err));
      }

      await refreshCompanies();
      navigate("/register-success", { state: { slug: company.slug, adminCode } });
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || "Registration failed");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-elevated border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary">
              <Building2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold font-display">Register Your Company</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set up your restaurant to start managing it
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Logo upload */}
              <div className="space-y-2">
                <Label>Company Logo</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-16 w-16 rounded-xl object-cover border border-border"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <label className="h-16 w-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                      <Upload className="h-5 w-5 text-muted-foreground" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 2MB
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="My Restaurant"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug *</Label>
                <div className="flex items-center gap-0">
                  <span className="inline-flex items-center px-3 h-9 rounded-l-md border border-r-0 border-input bg-muted text-sm text-muted-foreground whitespace-nowrap">
                    lktech.life/
                  </span>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="my-restaurant"
                    required
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Your company will be accessible at lktech.life/{form.slug || "your-name"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    placeholder="info@restaurant.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 555-0123"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="123 Main St, City"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Tell us about your restaurant..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Register Company
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
