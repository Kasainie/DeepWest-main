---
name: Per-Tenant PWA Branding
description: Each company URL installs as its own branded PWA with company name, logo, theme color, and unique scope/start_url
type: feature
---
Each tenant gets its own installable PWA on the same origin (lktech.life).

How it works:
- `src/hooks/useTenantManifest.ts` runs on every route change inside `<BrowserRouter>` (called from `AppRoutes` in `src/App.tsx`).
- When the URL is `/:slug` or `/login/:slug` (and `:slug` is not a reserved route), it calls `get_company_by_slug` RPC + reads `company_branding.primary_color`.
- It dynamically generates a `application/manifest+json` blob with: `id=/<slug>`, `start_url=/<slug>`, `scope=/<slug>`, `name=<company.name>`, `theme_color`/`background_color` derived from the company's primary HSL (converted to hex), and `icons` pointing at `company.logo_url` (fallback `/pwa-512.png`).
- It also overrides `<link rel="apple-touch-icon">`, `<meta name="theme-color">`, `<meta name="apple-mobile-web-app-title">`, and `document.title` so iOS "Add to Home Screen" picks up the brand (iOS ignores manifest icons/name).
- Chrome/Android treat distinct `id`+`scope`+`start_url` as separate installable apps, so `/movin` and `/acme` install as two distinct apps.

Public route `/:slug` (added in `App.tsx`) renders `Login` so the install's `start_url` always loads the tenant-branded login. Authenticated users are redirected to `/dashboard` by `Login`.

Reserved top-level paths (login, dashboard, rooms, etc.) are excluded in `RESERVED` set inside the hook; only unknown single-segment paths are treated as tenant slugs.

Vite PWA manifest in `vite.config.ts` is the LKTECH default; per-tenant manifests fully replace it at runtime via `<link rel="manifest" href="blob:...">`.
