import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { useBranding } from "@/contexts/BrandingContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Palette, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

const HEADING_FONTS = [
  "Playfair Display",
  "Cormorant Garamond",
  "Libre Baskerville",
  "Lora",
  "Merriweather",
  "Montserrat",
  "Raleway",
];

const BODY_FONTS = [
  "DM Sans",
  "Inter",
  "Poppins",
  "Montserrat",
  "Raleway",
  "Lora",
];

const DEFAULTS = {
  primary_color: "28 60% 42%",
  accent_color: "160 40% 40%",
  sidebar_color: "220 20% 8%",
  font_heading: "Playfair Display",
  font_body: "DM Sans",
  welcome_message: "",
};

function hslStringToHex(hslStr: string): string {
  const parts = hslStr.trim().split(/\s+/);
  const h = parseFloat(parts[0]) || 0;
  const s = parseFloat(parts[1]) / 100 || 0;
  const l = parseFloat(parts[2]) / 100 || 0;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hexToHslString(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "0 0% 0%";
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

export default function BrandingSettings() {
  const { currentCompany, companyRole } = useCompany();
  const { branding, refreshBranding } = useBranding();
  const canEdit = companyRole === "owner" || companyRole === "admin";
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    primary_color: DEFAULTS.primary_color,
    accent_color: DEFAULTS.accent_color,
    sidebar_color: DEFAULTS.sidebar_color,
    font_heading: DEFAULTS.font_heading,
    font_body: DEFAULTS.font_body,
    welcome_message: "",
  });

  useEffect(() => {
    if (branding) {
      setForm({
        primary_color: branding.primary_color || DEFAULTS.primary_color,
        accent_color: branding.accent_color || DEFAULTS.accent_color,
        sidebar_color: branding.sidebar_color || DEFAULTS.sidebar_color,
        font_heading: branding.font_heading || DEFAULTS.font_heading,
        font_body: branding.font_body || DEFAULTS.font_body,
        welcome_message: branding.welcome_message || "",
      });
    }
  }, [branding]);

  const handleColorChange = (field: string, hex: string) => {
    const hsl = hexToHslString(hex);
    setForm((f) => ({ ...f, [field]: hsl }));
  };

  const handleReset = () => {
    setForm({ ...DEFAULTS, welcome_message: "" });
  };

  const handleSave = async () => {
    if (!currentCompany || !canEdit) return;
    setSaving(true);

    try {
      const payload = {
        company_id: currentCompany.id,
        primary_color: form.primary_color,
        accent_color: form.accent_color,
        sidebar_color: form.sidebar_color,
        font_heading: form.font_heading,
        font_body: form.font_body,
        welcome_message: form.welcome_message.trim() || null,
      };

      if (branding) {
        const { error } = await supabase
          .from("company_branding" as any)
          .update(payload as any)
          .eq("id", branding.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("company_branding" as any)
          .insert(payload as any);
        if (error) throw error;
      }

      await refreshBranding();
      toast.success("Branding saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  if (!currentCompany) return null;

  return (
    <motion.div variants={item}>
      <Card className="shadow-card border-0">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg font-display">Branding & Theme</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Customize your dashboard appearance
              </p>
            </div>
          </div>
          {canEdit && (
            <Button variant="ghost" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Colors */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Brand Colors</Label>
            <div className="grid grid-cols-3 gap-4">
              {([
                { key: "primary_color", label: "Primary" },
                { key: "accent_color", label: "Accent" },
                { key: "sidebar_color", label: "Sidebar" },
              ] as const).map(({ key, label }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <input
                        type="color"
                        value={hslStringToHex(form[key])}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        disabled={!canEdit}
                        className="w-10 h-10 rounded-lg border border-border cursor-pointer appearance-none bg-transparent [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-webkit-color-swatch]:rounded-md [&::-webkit-color-swatch]:border-0"
                      />
                    </div>
                    <code className="text-xs text-muted-foreground font-mono">
                      {hslStringToHex(form[key])}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Preview</Label>
            <div
              className="rounded-xl border border-border overflow-hidden"
              style={{ height: 80 }}
            >
              <div className="flex h-full">
                <div
                  className="w-16 flex items-center justify-center"
                  style={{ backgroundColor: `hsl(${form.sidebar_color})` }}
                >
                  <div
                    className="h-6 w-6 rounded-md"
                    style={{ backgroundColor: `hsl(${form.primary_color})` }}
                  />
                </div>
                <div className="flex-1 p-3 bg-background">
                  <div
                    className="text-sm font-semibold mb-1"
                    style={{ fontFamily: `'${form.font_heading}', serif` }}
                  >
                    Dashboard Preview
                  </div>
                  <div
                    className="text-xs text-muted-foreground mb-2"
                    style={{ fontFamily: `'${form.font_body}', sans-serif` }}
                  >
                    This is how your dashboard will look
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="h-5 px-3 rounded text-[10px] text-white flex items-center"
                      style={{ backgroundColor: `hsl(${form.primary_color})` }}
                    >
                      Button
                    </div>
                    <div
                      className="h-5 px-3 rounded text-[10px] text-white flex items-center"
                      style={{ backgroundColor: `hsl(${form.accent_color})` }}
                    >
                      Accent
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Fonts */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Typography</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Heading Font</Label>
                <Select
                  value={form.font_heading}
                  onValueChange={(v) => setForm((f) => ({ ...f, font_heading: v }))}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {HEADING_FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: `'${font}', serif` }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Body Font</Label>
                <Select
                  value={form.font_body}
                  onValueChange={(v) => setForm((f) => ({ ...f, font_body: v }))}
                  disabled={!canEdit}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_FONTS.map((font) => (
                      <SelectItem key={font} value={font}>
                        <span style={{ fontFamily: `'${font}', sans-serif` }}>{font}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Welcome Message</Label>
            <Textarea
              value={form.welcome_message}
              onChange={(e) => setForm((f) => ({ ...f, welcome_message: e.target.value }))}
              disabled={!canEdit}
              placeholder="Welcome to our hotel management system..."
              rows={2}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground">
              Shown on the dashboard. {form.welcome_message.length}/200
            </p>
          </div>

          {canEdit && (
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Branding
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
