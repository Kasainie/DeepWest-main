import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { SESSION_INACTIVITY_TIMEOUT_MS } from "@/lib/sessionInactivity";
import { toast } from "sonner";

const LAST_ACTIVITY_STORAGE_PREFIX = "lktech_last_activity:";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isDemo: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const demoMode = localStorage.getItem("lktech_demo") === "true";
  const demoSession = {
    access_token: "lktech-demo-token",
    refresh_token: "lktech-demo-refresh",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: {
      id: "00000000-0000-0000-0000-000000000001",
      app_metadata: { provider: "demo", providers: ["demo"] },
      user_metadata: { full_name: "Demo Administrator" },
      aud: "authenticated",
      created_at: "2026-01-01T00:00:00.000Z",
      role: "authenticated",
    },
  } as Session;

  const [session, setSession] = useState<Session | null>(demoMode ? demoSession : null);
  const [loading, setLoading] = useState(!demoMode);
  const [isDemo] = useState(demoMode);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user.id) {
          localStorage.setItem(
            `${LAST_ACTIVITY_STORAGE_PREFIX}${session.user.id}`,
            String(Date.now()),
          );
        }
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [isDemo]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId || isDemo) return;

    const activityKey = `${LAST_ACTIVITY_STORAGE_PREFIX}${userId}`;
    const storedActivity = Number(localStorage.getItem(activityKey));
    let lastActivityAt = Number.isFinite(storedActivity) && storedActivity > 0
      ? storedActivity
      : Date.now();
    let lastPersistedActivityAt = lastActivityAt;
    let timeoutId: number | undefined;
    let isLocking = false;

    if (!storedActivity) {
      localStorage.setItem(activityKey, String(lastActivityAt));
    }

    const lockSession = () => {
      if (isLocking) return;
      isLocking = true;
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      void supabase.auth.signOut({ scope: "local" }).then(({ error }) => {
        if (error) {
          toast.error("Automatic lock failed", { description: error.message });
        }
      }).catch((error: unknown) => {
        toast.error("Automatic lock failed", {
          description: error instanceof Error ? error.message : "Please sign in again.",
        });
      });
    };

    const syncActivityFromStorage = () => {
      const timestamp = Number(localStorage.getItem(activityKey));
      if (Number.isFinite(timestamp) && timestamp > lastActivityAt) {
        lastActivityAt = timestamp;
        lastPersistedActivityAt = timestamp;
      }
    };

    const scheduleLockCheck = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      const remaining = SESSION_INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt);
      if (remaining <= 0) {
        lockSession();
      } else {
        timeoutId = window.setTimeout(scheduleLockCheck, remaining);
      }
    };

    const checkForInactivity = () => {
      syncActivityFromStorage();
      scheduleLockCheck();
    };

    const recordActivity = () => {
      syncActivityFromStorage();
      const now = Date.now();
      if (now - lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS) {
        lockSession();
        return;
      }

      lastActivityAt = now;
      if (now - lastPersistedActivityAt >= 1000) {
        localStorage.setItem(activityKey, String(now));
        lastPersistedActivityAt = now;
      }
      scheduleLockCheck();
    };

    const syncActivityEvent = (event: StorageEvent) => {
      if (event.key !== activityKey || !event.newValue) return;
      const timestamp = Number(event.newValue);
      if (Number.isFinite(timestamp) && timestamp > lastActivityAt) {
        lastActivityAt = timestamp;
        lastPersistedActivityAt = timestamp;
        scheduleLockCheck();
      }
    };

    const activityEvents = ["pointerdown", "pointermove", "keydown", "touchstart", "wheel", "scroll"];
    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, recordActivity, { passive: true });
    });
    window.addEventListener("focus", checkForInactivity);
    window.addEventListener("storage", syncActivityEvent);
    document.addEventListener("visibilitychange", checkForInactivity);
    scheduleLockCheck();

    return () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, recordActivity);
      });
      window.removeEventListener("focus", checkForInactivity);
      window.removeEventListener("storage", syncActivityEvent);
      document.removeEventListener("visibilitychange", checkForInactivity);
    };
  }, [session?.user.id, isDemo]);

  const signOut = async () => {
    if (isDemo) {
      localStorage.removeItem("lktech_demo");
      setSession(null);
      window.location.assign("/");
      return;
    }
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, isDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
