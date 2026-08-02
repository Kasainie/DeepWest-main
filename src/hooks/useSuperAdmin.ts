import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Server-authoritative super admin check.
 * Reads the `is_super_admin` flag from the database (service-role writable only)
 * instead of comparing a hardcoded email on the client.
 */
export function useSuperAdmin() {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    (supabase.rpc as any)("is_super_admin", { _user_id: user.id }).then(
      ({ data }: { data: unknown }) => {
        if (!active) return;
        setIsSuperAdmin(Boolean(data));
        setLoading(false);
      },
    );

    return () => {
      active = false;
    };
  }, [user]);

  return { isSuperAdmin, loading };
}
