import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, UserCheck, UserX, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";

const APPROVAL_SOUND_URL = "https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3";


interface PendingUser {
  user_id: string;
  email: string;
  full_name: string | null;
  created_at: string;
}

export function SuperAdminApprovals() {
  const { user } = useAuth();
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const { isSuperAdmin } = useSuperAdmin();

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playSound = useCallback(() => {
    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(APPROVAL_SOUND_URL);
      }
      audioRef.current.volume = 0.5;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    } catch {}
  }, []);

  const fetchPending = useCallback(async () => {
    if (!isSuperAdmin) return;
    setLoading(true);
    const { data } = await supabase.functions.invoke("super-admin-companies");
    if (data?.pendingUsers) {
      setPendingUsers(data.pendingUsers);
    }
    setLoading(false);
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Listen for new profile registrations in realtime
  useEffect(() => {
    if (!isSuperAdmin) return;

    const channel = supabase
      .channel("super-admin-approvals")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "profiles" },
        (payload) => {
          const newProfile = payload.new as any;
          if (!newProfile.is_approved) {
            playSound();
            toast("New company registration pending approval", { icon: "🛡️" });
            fetchPending();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isSuperAdmin, playSound, fetchPending]);

  const handleApproval = async (userId: string, approved: boolean) => {
    setProcessing((prev) => new Set(prev).add(userId));
    const { data, error } = await supabase.functions.invoke("super-admin-companies?action=approve_user", {
      body: { user_id: userId, approved },
    });
    if (error || data?.error) {
      toast.error("Failed to update user approval");
    } else {
      setPendingUsers((prev) => prev.filter((u) => u.user_id !== userId));
      toast.success(approved ? "User approved" : "User rejected");
    }
    setProcessing((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  };

  if (!isSuperAdmin) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShieldCheck className="h-4 w-4" />
          {pendingUsers.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center">
              {pendingUsers.length > 9 ? "9+" : pendingUsers.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold font-display">Pending Approvals</h3>
        </div>
        <ScrollArea className="max-h-80">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : pendingUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <ShieldCheck className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No pending approvals</p>
            </div>
          ) : (
            <div className="divide-y">
              {pendingUsers.map((u) => (
                <div key={u.user_id} className="px-4 py-3 space-y-2">
                  <div>
                    <p className="text-xs font-medium">{u.full_name || "Unknown"}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1 flex-1"
                      disabled={processing.has(u.user_id)}
                      onClick={() => handleApproval(u.user_id, true)}
                    >
                      {processing.has(u.user_id) ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <UserCheck className="h-3 w-3" />
                      )}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-7 text-xs gap-1 flex-1"
                      disabled={processing.has(u.user_id)}
                      onClick={() => handleApproval(u.user_id, false)}
                    >
                      <UserX className="h-3 w-3" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
