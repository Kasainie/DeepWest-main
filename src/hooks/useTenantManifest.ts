import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface TenantInfo {
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color?: string | null; // HSL string e.g. "28 60% 42%"
}

const DEFAULT_NAME = "LKTECH Hospitality";
const DEFAULT_THEME = "#0f1b3d";
const DEFAULT_TITLE = "lktech";
const DEFAULT_APPLE_ICON = "/apple-touch-icon.png";

// Track previously-created blob URLs so we can revoke them
let lastBlobUrl: string | null = null;

/** Convert "H S% L%" => "#rrggbb" (best-effort; falls back to default theme color). */
function hslToHex(hsl: string | null | undefined): string {
  if (!hsl) return DEFAULT_THEME;
  const m = hsl.trim().match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%$/);
  if (!m) return DEFAULT_THEME;
  const h = parseFloat(m[1]) / 360;
  const s = parseFloat(m[2]) / 100;
  const l = parseFloat(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const toHex = (x: number) => {
    const h2 = Math.round(x * 255).toString(16);
    return h2.length === 1 ? "0" + h2 : h2;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function setOrCreate<K extends keyof HTMLElementTagNameMap>(
  selector: string,
  tag: K,
  attrs: Record<string, string>,
): HTMLElementTagNameMap[K] {
  let el = document.head.querySelector<HTMLElementTagNameMap[K]>(selector);
  if (!el) {
    el = document.createElement(tag);
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
  return el;
}

function applyManifestForTenant(tenant: TenantInfo) {
  const themeColor = hslToHex(tenant.primary_color);
  const icon = tenant.logo_url || "/pwa-512.png";

  const manifest = {
    id: `/${tenant.slug}`,
    name: tenant.name,
    short_name: tenant.name.length > 12 ? tenant.name.slice(0, 12) : tenant.name,
    description: `${tenant.name} on LKTECH`,
    start_url: `/${tenant.slug}`,
    scope: `/${tenant.slug}`,
    display: "standalone",
    orientation: "portrait",
    theme_color: themeColor,
    background_color: themeColor,
    icons: [
      { src: icon, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: icon, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: icon, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  // Replace any existing manifest blob URL
  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }
  const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
  const url = URL.createObjectURL(blob);
  lastBlobUrl = url;

  setOrCreate('link[rel="manifest"]', "link", { rel: "manifest", href: url });
  setOrCreate('meta[name="theme-color"]', "meta", { name: "theme-color", content: themeColor });
  setOrCreate('meta[name="apple-mobile-web-app-title"]', "meta", {
    name: "apple-mobile-web-app-title",
    content: tenant.name,
  });
  setOrCreate('link[rel="apple-touch-icon"]', "link", { rel: "apple-touch-icon", href: icon });

  document.title = tenant.name;
}

function applyDefaultManifest() {
  if (lastBlobUrl) {
    URL.revokeObjectURL(lastBlobUrl);
    lastBlobUrl = null;
  }
  setOrCreate('link[rel="manifest"]', "link", { rel: "manifest", href: "/manifest.webmanifest" });
  setOrCreate('meta[name="theme-color"]', "meta", { name: "theme-color", content: DEFAULT_THEME });
  setOrCreate('meta[name="apple-mobile-web-app-title"]', "meta", {
    name: "apple-mobile-web-app-title",
    content: "LKTECH",
  });
  setOrCreate('link[rel="apple-touch-icon"]', "link", {
    rel: "apple-touch-icon",
    href: DEFAULT_APPLE_ICON,
  });
  document.title = DEFAULT_TITLE;
}

/** Reserved top-level paths that are NOT tenant slugs. */
const RESERVED = new Set([
  "",
  "login",
  "dashboard",
  "rooms",
  "restaurant",
  "bar",
  "bar-admin",
  "kitchen",
  "conference",
  "bookings",
  "guests",
  "sales",
  "tenders",
  "expenses",
  "staff",
  "website",
  "settings",
  "about",
  "super-admin",
  "register-company",
  "register-success",
  "accept-invite",
  "pending-approval",
  "forgot-password",
  "reset-password",
  "install",
  "~oauth",
]);

function extractSlug(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length === 0) return null;
  // /login/:slug
  if (parts[0] === "login" && parts[1]) return parts[1];
  // /:slug (top-level tenant landing)
  if (parts.length === 1 && !RESERVED.has(parts[0])) return parts[0];
  return null;
}

/**
 * Per-tenant PWA branding: when the URL contains a company slug, replace the
 * web app manifest, theme color, apple-touch-icon, and document title with
 * the company's branding so each tenant installs as its own app.
 */
export function useTenantManifest() {
  const { pathname } = useLocation();

  useEffect(() => {
    const slug = extractSlug(pathname);
    if (!slug) {
      applyDefaultManifest();
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("get_company_by_slug", { _slug: slug });
      if (cancelled) return;
      const company = Array.isArray(data) && data.length > 0 ? data[0] : null;
      if (!company) {
        applyDefaultManifest();
        return;
      }

      // Try to fetch primary_color from branding (best-effort, not required).
      const { data: branding } = await supabase
        .from("company_branding" as any)
        .select("primary_color")
        .eq("company_id", company.id)
        .maybeSingle();

      if (cancelled) return;
      applyManifestForTenant({
        name: company.name,
        slug: company.slug,
        logo_url: company.logo_url,
        primary_color: (branding as any)?.primary_color ?? null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [pathname]);
}
