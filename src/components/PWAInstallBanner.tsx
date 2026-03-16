import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check dismissed in sessionStorage so it reappears next session
    if (sessionStorage.getItem("pwa-banner-dismissed")) {
      setDismissed(true);
    }

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Only show on narrow viewports (mobile)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (isInstalled || dismissed || !isMobile) return null;
  // Show only if there's a native prompt OR on iOS (which doesn't fire beforeinstallprompt)
  if (!deferredPrompt && !isIOS) return null;

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // iOS — navigate to install instructions page
      navigate("/install");
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem("pwa-banner-dismissed", "1");
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] animate-in slide-in-from-bottom-4 duration-300">
      <div className="mx-2 mb-2 rounded-xl border bg-card shadow-lg">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary">
            <Download className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">Install LKTech</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">
              Add to home screen for quick access
            </p>
          </div>
          <Button size="sm" className="shrink-0 h-8 px-3 text-xs" onClick={handleInstall}>
            Install
          </Button>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
