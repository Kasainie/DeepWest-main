import { CloudOff, RefreshCw, CloudUpload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { toast } from "sonner";

export function OfflineIndicator() {
  const { online, pending, syncing, syncNow } = useOfflineSync();

  if (online && pending === 0 && !syncing) return null;

  const handleSync = async () => {
    const { synced, failed } = await syncNow();
    if (synced) toast.success(`${synced} offline change${synced === 1 ? "" : "s"} synced`);
    if (failed) toast.error(`${failed} change${failed === 1 ? "" : "s"} could not be saved`);
    if (!synced && !failed) toast.info("Nothing to sync yet");
  };

  if (!online) {
    return (
      <Badge variant="outline" className="gap-1.5 border-warning/40 bg-warning/10 text-warning">
        <CloudOff className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Offline</span>
        {pending > 0 && <span>· {pending}</span>}
      </Badge>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 gap-1.5 text-xs"
      onClick={handleSync}
      disabled={syncing}
    >
      {syncing ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <CloudUpload className="h-3.5 w-3.5" />}
      {syncing ? "Syncing…" : `Sync ${pending}`}
    </Button>
  );
}
