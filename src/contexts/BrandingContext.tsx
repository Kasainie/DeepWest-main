import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";

interface Branding {
  id: string;
  company_id: string;
  primary_color: string;
  accent_color: string;
  sidebar_color: string;
  font_heading: string;
  font_body: string;
  welcome_message: string | null;
  theme_mode: "light" | "dark";
}

interface BrandingContextType {
  branding: Branding | null;
  loading: boolean;
  refreshBranding: () => Promise<void>;
}

const DEFAULT_BRANDING: Omit<Branding, "id" | "company_id"> = {
  primary_color: "28 60% 42%",
  accent_color: "160 40% 40%",
  sidebar_color: "220 20% 8%",
  font_heading: "Playfair Display",
  font_body: "DM Sans",
  welcome_message: null,
  theme_mode: "light",
};

const FONT_URLS: Record<string, string> = {
  "Playfair Display": "Playfair+Display:wght@400;500;600;700",
  "DM Sans": "DM+Sans:wght@300;400;500;600;700",
  "Inter": "Inter:wght@300;400;500;600;700",
  "Poppins": "Poppins:wght@300;400;500;600;700",
  "Lora": "Lora:wght@400;500;600;700",
  "Merriweather": "Merriweather:wght@300;400;700",
  "Montserrat": "Montserrat:wght@300;400;500;600;700",
  "Raleway": "Raleway:wght@300;400;500;600;700",
  "Cormorant Garamond": "Cormorant+Garamond:wght@300;400;500;600;700",
  "Libre Baskerville": "Libre+Baskerville:wght@400;700",
};

const BrandingContext = createContext<BrandingContextType>({
  branding: null,
  loading: true,
  refreshBranding: async () => {},
});

export const useBranding = () => useContext(BrandingContext);

function applyBranding(b: Omit<Branding, "id" | "company_id"> | null) {
  const vals = b || DEFAULT_BRANDING;
  const root = document.documentElement;

  // Apply dark/light mode
  if (vals.theme_mode === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }

  root.style.setProperty("--primary", vals.primary_color);
  root.style.setProperty("--ring", vals.primary_color);
  root.style.setProperty("--sidebar-primary", vals.primary_color);
  root.style.setProperty("--accent", vals.accent_color);
  root.style.setProperty("--sidebar-background", vals.sidebar_color);

  const headingFamily = `'${vals.font_heading}', serif`;
  const bodyFamily = `'${vals.font_body}', sans-serif`;
  root.style.setProperty("--font-display", headingFamily);
  root.style.setProperty("--font-body", bodyFamily);

  // Load fonts dynamically
  const fonts = new Set<string>();
  if (FONT_URLS[vals.font_heading]) fonts.add(FONT_URLS[vals.font_heading]);
  if (FONT_URLS[vals.font_body]) fonts.add(FONT_URLS[vals.font_body]);

  const linkId = "branding-fonts";
  let link = document.getElementById(linkId) as HTMLLinkElement | null;
  const href = `https://fonts.googleapis.com/css2?${[...fonts].map((f) => `family=${f}`).join("&")}&display=swap`;

  if (!link) {
    link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  link.href = href;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const { currentCompany } = useCompany();
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBranding = useCallback(async () => {
    if (!currentCompany) {
      setBranding(null);
      applyBranding(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("company_branding" as any)
      .select("*")
      .eq("company_id", currentCompany.id)
      .maybeSingle();

    if (data) {
      const b = data as unknown as Branding;
      setBranding(b);
      applyBranding(b);
    } else {
      setBranding(null);
      applyBranding(null);
    }
    setLoading(false);
  }, [currentCompany?.id]);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Reset CSS vars on unmount
  useEffect(() => {
    return () => applyBranding(null);
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, loading, refreshBranding: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}
