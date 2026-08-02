import { useEffect, useState } from "react";
import { listOutbox, subscribeOutbox } from "@/lib/offline/store";
import { subscribeSync, syncNow } from "@/lib/offline/sync";

export function useOfflineSync() {
  const [online, setOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const refresh = () => void listOutbox().then((items) => setPending(items.length));
    refresh();

    const unsubOutbox = subscribeOutbox(refresh);
    const unsubSync = subscribeSync((state) => {
      setSyncing(state.syncing);
      setPending(state.pending);
    });

    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      unsubOutbox();
      unsubSync();
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return { online, pending, syncing, syncNow };
}
