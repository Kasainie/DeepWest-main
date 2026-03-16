import { useState, useEffect } from "react";
import { useCompany } from "@/contexts/CompanyContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle2, Smartphone, Monitor, Share2, MoreVertical, Building2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallApp() {
  const { currentCompany } = useCompany();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setInstalling(false);
  };

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 max-w-lg mx-auto">
      {/* Company branding */}
      <div className="flex flex-col items-center gap-3 text-center">
        {currentCompany?.logo_url ? (
          <img
            src={currentCompany.logo_url}
            alt={currentCompany.name}
            className="h-20 w-20 rounded-2xl object-cover shadow-lg"
          />
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
            <Building2 className="h-10 w-10 text-primary-foreground" />
          </div>
        )}
        <h1 className="text-2xl font-bold text-foreground">
          {currentCompany?.name || "LKTech"}
        </h1>
        <p className="text-muted-foreground text-sm">
          Install the app on your device for quick access to your company dashboard
        </p>
      </div>

      {isInstalled ? (
        <Card className="w-full">
          <CardContent className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <p className="font-semibold text-lg">App Already Installed!</p>
            <p className="text-muted-foreground text-sm text-center">
              You can find it on your home screen. All data is scoped to{" "}
              <span className="font-medium text-foreground">{currentCompany?.name}</span>.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Direct install button (Chrome/Edge on Android & Desktop) */}
          {deferredPrompt && (
            <Button
              size="lg"
              className="w-full gap-2 text-base h-14"
              onClick={handleInstall}
              disabled={installing}
            >
              <Download className="h-5 w-5" />
              {installing ? "Installing..." : "Install App"}
            </Button>
          )}

          {/* iOS instructions */}
          {isIOS && !deferredPrompt && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Install on iPhone / iPad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Tap the <Share2 className="h-4 w-4 inline" /> <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Scroll down and tap <strong>"Add to Home Screen"</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Tap <strong>"Add"</strong> to confirm</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Android fallback instructions */}
          {isAndroid && !deferredPrompt && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Install on Android
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">1</span>
                  <span>Tap the <MoreVertical className="h-4 w-4 inline" /> menu in Chrome</span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">2</span>
                  <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shrink-0">3</span>
                  <span>Tap <strong>"Install"</strong> to confirm</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Desktop fallback */}
          {!isIOS && !isAndroid && !deferredPrompt && (
            <Card className="w-full">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Install on Desktop
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">
                <p>Look for the install icon <Download className="h-4 w-4 inline" /> in your browser's address bar, or use the browser menu to install this app.</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Data isolation note */}
      <p className="text-xs text-muted-foreground text-center px-4">
        This app will only show data for <strong>{currentCompany?.name}</strong>.
        Your company data is fully isolated and secure.
      </p>
    </div>
  );
}
