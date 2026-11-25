import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics } from "@capacitor/haptics";
import { supabase } from "@/integrations/supabase/client";
import { useCompany } from "@/contexts/CompanyContext";
import { getNotificationSoundForStaff, notificationSounds } from "@/lib/notificationSounds";
import { Bell, Check, CheckCheck, Info, AlertTriangle, UserPlus, ShoppingCart, CalendarDays, X, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// No more static type-to-department mapping — we use the `department` column from DB

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  department: string | null;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  warning: AlertTriangle,
  staff: UserPlus,
  order: ShoppingCart,
  booking: CalendarDays,
};

const typeColors: Record<string, string> = {
  info: "bg-primary/10 text-primary",
  warning: "bg-warning/10 text-warning",
  staff: "bg-accent/10 text-accent-foreground",
  order: "bg-success/10 text-success",
  booking: "bg-secondary text-secondary-foreground",
};

function loadSoundSettings() {
  try {
    const stored = localStorage.getItem("notification_sound_settings");
    if (stored) return JSON.parse(stored) as { enabled: boolean; volume: number };
  } catch {}
  return { enabled: true, volume: 0.5 };
}

export function NotificationDropdown() {
  const { currentCompany, companyRole, staffDepartment, staffRole } = useCompany();
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [soundSettings, setSoundSettings] = useState(loadSoundSettings);

  const isFullAccess = !companyRole || ["owner", "admin", "manager"].includes(companyRole);

  // Filter notifications based on staff department access using the department column
  const notifications = useMemo(() => {
    if (isFullAccess) return allNotifications;
    return allNotifications.filter((n) => {
      // No department set = admin-only (e.g. staff notifications)
      if (!n.department) return false;
      // If staff has no departments assigned, show nothing department-specific
      if (!staffDepartment || staffDepartment.length === 0) return false;
      // Match notification department against staff's departments
      return staffDepartment.some(d => d.toLowerCase() === n.department?.toLowerCase());
    });
  }, [allNotifications, isFullAccess, staffDepartment]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const updateSoundSettings = useCallback((update: Partial<{ enabled: boolean; volume: number }>) => {
    setSoundSettings((prev) => {
      const next = { ...prev, ...update };
      localStorage.setItem("notification_sound_settings", JSON.stringify(next));
      return next;
    });
  }, []);

  const audioCache = useRef<Record<string, HTMLAudioElement>>({});

  const playNotificationSound = useCallback((soundUrl: string, preview = false) => {
    if (!preview && !soundSettings.enabled) return;
    try {
      if (!audioCache.current[soundUrl]) {
        audioCache.current[soundUrl] = new Audio(soundUrl);
        audioCache.current[soundUrl].preload = "auto";
      }
      const audio = audioCache.current[soundUrl];
      audio.volume = soundSettings.volume;
      audio.currentTime = 0;
      void audio.play().catch((error: unknown) => {
        console.error("Failed to play notification sound", error);
        if (preview) {
          toast.error("Couldn't play the sound. Check your connection and device volume.");
        }
      });
    } catch (error: unknown) {
      console.error("Failed to play notification sound", error);
      if (preview) {
        toast.error("Couldn't play the sound. Check your connection and device volume.");
      }
    }
  }, [soundSettings.enabled, soundSettings.volume]);

  const vibrateForAndroidNotification = useCallback(() => {
    const isAndroid = Capacitor.getPlatform() === "android" ||
      (typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent));
    if (!isAndroid) return;

    void Haptics.vibrate({ duration: 250 }).catch((error: unknown) => {
      console.error("Failed to vibrate for notification", error);
    });
  }, []);

  useEffect(() => {
    if (!currentCompany) return;
    fetchNotifications();

    const channel = supabase
      .channel("notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `company_id=eq.${currentCompany.id}` },
        (payload) => {
          setAllNotifications((prev) => [payload.new as Notification, ...prev]);
          // Only play sound if the notification passes the department filter
          const newNotif = payload.new as Notification;
          const shouldShow = isFullAccess || 
            (newNotif.department && staffDepartment?.some(d => d.toLowerCase() === newNotif.department?.toLowerCase()));
          if (shouldShow) {
            playNotificationSound(getNotificationSoundForStaff(staffRole, staffDepartment));
            vibrateForAndroidNotification();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentCompany?.id, playNotificationSound, vibrateForAndroidNotification, isFullAccess, staffDepartment, staffRole]);

  const fetchNotifications = async () => {
    if (!currentCompany) return;
    const { data } = await supabase
      .from("notifications")
      .select("id, title, message, type, department, is_read, created_at")
      .eq("company_id", currentCompany.id)
      .order("created_at", { ascending: false })
      .limit(20);

    if (data) setAllNotifications(data);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setAllNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllRead = async () => {
    if (!currentCompany) return;
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setAllNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const deleteNotification = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await supabase.from("notifications").delete().eq("id", id);
    setAllNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8 sm:h-10 sm:w-10">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold font-display">Notifications</h3>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1" onClick={markAllRead}>
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowSettings((s) => !s)}
              title="Sound settings"
            >
              {soundSettings.enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
          </div>
        </div>
        {showSettings && (
          <div className="px-4 py-3 border-b bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">Notification Sound</label>
              <Switch
                checked={soundSettings.enabled}
                onCheckedChange={(checked) => updateSoundSettings({ enabled: checked })}
              />
            </div>
            {soundSettings.enabled && (
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Volume</label>
                <div className="flex items-center gap-2">
                  <VolumeX className="h-3 w-3 text-muted-foreground shrink-0" />
                  <Slider
                    value={[soundSettings.volume * 100]}
                    onValueChange={([v]) => updateSoundSettings({ volume: v / 100 })}
                    max={100}
                    step={5}
                    className="flex-1"
                  />
                  <Volume2 className="h-3 w-3 text-muted-foreground shrink-0" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">Preview notification sounds</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(notificationSounds)
                  .map(([soundName, sound]) => (
                    <Button
                      key={soundName}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-xs capitalize"
                      aria-label={`Play ${sound.label} notification sound`}
                      onClick={() => playNotificationSound(sound.src, true)}
                    >
                      <Volume2 className="h-3 w-3" />
                      {sound.label}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        )}
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const Icon = typeIcons[notif.type] || Info;
                return (
                  <button
                    key={notif.id}
                    onClick={() => !notif.is_read && markAsRead(notif.id)}
                    className={`group w-full text-left flex gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors ${
                      !notif.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${typeColors[notif.type] || typeColors.info}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium truncate">{notif.title}</p>
                        {!notif.is_read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={(e) => deleteNotification(e, notif.id)}
                      title="Delete notification"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
