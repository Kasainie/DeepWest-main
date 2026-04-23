import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Laptop, Smartphone, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayModeChange = () => setIsInstalled(mediaQuery.matches);
    handleDisplayModeChange();

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    mediaQuery.addEventListener("change", handleDisplayModeChange);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      mediaQuery.removeEventListener("change", handleDisplayModeChange);
    };
  }, []);

  const platformLabel = useMemo(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) return "Android";
    if (ua.includes("windows")) return "Windows";
    if (ua.includes("iphone") || ua.includes("ipad")) return "iPhone / iPad";
    return "your device";
  }, []);

  const canPromptInstall = Boolean(deferredPrompt) && !isInstalled;

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center px-6 py-12">
        <Link to="/" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm text-muted-foreground">
              <Download className="h-4 w-4 text-primary" /> Install LKTECH
            </div>

            <div className="space-y-4">
              <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Install LKTECH on Android and Windows</h1>
              <p className="max-w-2xl text-lg text-muted-foreground">
                Android runs as a native Capacitor app. Windows installs directly from the browser as an app with its own icon and window.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={handleInstall} disabled={!canPromptInstall} className="gap-2">
                <Download className="h-4 w-4" />
                {isInstalled ? "Already installed" : canPromptInstall ? `Install on ${platformLabel}` : "Open browser install menu"}
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/login?mode=signup">Create account</Link>
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><Smartphone className="h-5 w-5 text-primary" /> Android</CardTitle>
                  <CardDescription>Native mobile app package powered by Capacitor.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Open the published app on Android and install it from the browser prompt, or package it into Android Studio for Play Store release.</p>
                  <div className="flex items-start gap-2 text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Optimized for home screen launch and app-like navigation.</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl"><Laptop className="h-5 w-5 text-primary" /> Windows</CardTitle>
                  <CardDescription>Installable directly from Edge or Chrome.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>If the install button above is disabled, open the browser menu and choose <span className="text-foreground">Install app</span> or <span className="text-foreground">Apps → Install this site as an app</span>.</p>
                  <div className="flex items-start gap-2 text-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                    <span>Installs with standalone window behavior, icon, and branded app name.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <Card className="h-fit lg:mt-16">
            <CardHeader>
              <CardTitle>Quick install tips</CardTitle>
              <CardDescription>Use the published app for the install prompt, not the editor preview.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Android</p>
                <p>Open the published URL in Chrome, tap the browser menu, then choose Install app or Add to Home screen.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Windows</p>
                <p>Open the published URL in Edge or Chrome and use the install icon in the address bar or the browser menu.</p>
              </div>
              <div>
                <p className="font-medium text-foreground">Accounts</p>
                <p>Owners and admins can sign in with email or Google, while staff can use their issued staff code.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}