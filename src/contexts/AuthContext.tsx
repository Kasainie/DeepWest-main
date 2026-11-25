import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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
      (_event, session) => {
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
