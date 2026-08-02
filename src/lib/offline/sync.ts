import { supabase } from "@/integrations/supabase/client";
import { dequeue, listOutbox, updateOutboxItem, emitOutboxChange, type OutboxItem } from "./store";

const MAX_ATTEMPTS = 5;
/** Items handed to the service worker are only replayed in-app if the SW clearly failed. */
const SHADOW_REPLAY_AFTER_MS = 6 * 60 * 60 * 1000;
let syncing = false;
let timer: ReturnType<typeof setTimeout> | null = null;

type SyncListener = (state: { syncing: boolean; pending: number; justSynced: number }) => void;
const listeners = new Set<SyncListener>();

export function subscribeSync(fn: SyncListener) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(state: { syncing: boolean; pending: number; justSynced: number }) {
  listeners.forEach((fn) => fn(state));
}

function rawFetch(): typeof fetch {
  return (window as unknown as { __originalFetch?: typeof fetch }).__originalFetch ?? fetch;
}

async function authHeaders(item: OutboxItem): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = { ...item.headers };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

/** Replays every queued mutation in the order it was made (last write wins). */
export async function syncNow(): Promise<{ synced: number; failed: number }> {
  if (syncing || !navigator.onLine) return { synced: 0, failed: 0 };
  const all = await listOutbox();
  const queue = all.filter(
    (i) => !i.swQueued || Date.now() - i.createdAt > SHADOW_REPLAY_AFTER_MS,
  );
  if (queue.length === 0) return { synced: 0, failed: 0 };

  syncing = true;
  emit({ syncing: true, pending: queue.length, justSynced: 0 });

  let synced = 0;
  let failed = 0;
  const doFetch = rawFetch();

  for (const item of queue) {
    try {
      const response = await doFetch(item.url, {
        method: item.method,
        headers: await authHeaders(item),
        body: item.body ?? undefined,
      });
      if (response.ok) {
        await dequeue(item.id);
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        // Permanent rejection (validation / permission) — drop it, keep the queue moving.
        await dequeue(item.id);
        failed++;
      } else {
        await updateOutboxItem({ ...item, attempts: item.attempts + 1, lastError: `HTTP ${response.status}` });
        if (item.attempts + 1 >= MAX_ATTEMPTS) {
          await dequeue(item.id);
          failed++;
        }
      }
    } catch (error) {
      await updateOutboxItem({
        ...item,
        attempts: item.attempts + 1,
        lastError: error instanceof Error ? error.message : "network error",
      });
      break; // still offline — stop and retry later
    }
  }

  syncing = false;
  const remaining = (await listOutbox()).length;
  emit({ syncing: false, pending: remaining, justSynced: synced });
  emitOutboxChange();
  return { synced, failed };
}

export function scheduleSync(delay = 1500) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    void syncNow();
  }, delay);
}

export function startSyncEngine() {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => scheduleSync(500));
  window.addEventListener("focus", () => scheduleSync(1000));
  setInterval(() => {
    if (navigator.onLine) void syncNow();
  }, 60_000);
  scheduleSync(3000);
}
