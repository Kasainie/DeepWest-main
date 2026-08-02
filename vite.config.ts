import fs from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

const apkPublicPath = "downloads/lktech.apk";
const apkExpectedFilename = /^lktech\.apk$/i;
const apkMinimumBytes = 1024 * 100; // 100 KB sanity floor — APKs are MB-sized
const apkAbsolutePath = path.resolve(__dirname, "public", apkPublicPath);

const apkAvailable = (() => {
  if (!fs.existsSync(apkAbsolutePath)) return false;
  if (!apkExpectedFilename.test(path.basename(apkAbsolutePath))) {
    console.warn(`[apk] Filename does not match expected pattern: ${path.basename(apkAbsolutePath)}`);
    return false;
  }
  const stats = fs.statSync(apkAbsolutePath);
  if (!stats.isFile() || stats.size < apkMinimumBytes) {
    console.warn(`[apk] File too small or not a file (size: ${stats.size} bytes). Disabling download button.`);
    return false;
  }
  return true;
})();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  define: {
    __APK_AVAILABLE__: JSON.stringify(apkAvailable),
    __APK_DOWNLOAD_URL__: JSON.stringify(apkAvailable ? `/${apkPublicPath}` : ""),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "robots.txt"],
      devOptions: {
        enabled: false,
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api/, /\/functions\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: "CacheFirst",
            options: {
              cacheName: "gstatic-fonts-cache",
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ url }) => url.origin.includes("supabase.co"),
            handler: "NetworkFirst",
            method: "GET",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Background Sync: failed offline writes are replayed by the browser
          // once connectivity returns, even if the app is closed.
          ...(["POST", "PATCH", "PUT", "DELETE"] as const).map((method) => ({
            urlPattern: ({ url }: { url: URL }) =>
              url.origin.includes("supabase.co") && url.pathname.startsWith("/rest/v1/"),
            handler: "NetworkOnly" as const,
            method,
            options: {
              backgroundSync: {
                name: `lktech-writes-${method.toLowerCase()}`,
                options: { maxRetentionTime: 24 * 60 },
              },
            },
          })),
        ],
      },
      // Default (LKTECH) manifest. Per-tenant manifests are injected at runtime
      // by `useTenantManifest` when a /:slug or /login/:slug URL is visited,
      // so each company installs as its own branded PWA (unique id/scope/start_url).
      manifest: {
        id: "/",
        name: "LKTECH Hospitality",
        short_name: "LKTECH",
        description: "All-in-one hospitality management platform",
        theme_color: "#0f1b3d",
        background_color: "#0f1b3d",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/pwa-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/pwa-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime"],
  },
}));
