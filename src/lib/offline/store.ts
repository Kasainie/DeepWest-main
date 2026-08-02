import { idb, CACHE_STORE, OUTBOX_STORE, isIDBAvailable } from "./idb";

export interface OutboxItem {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  table: string;
  createdAt: number;
  attempts: number;
  lastError?: string;
  /** Handed to the service worker Background Sync queue; app-side replay is a fallback only. */
  swQueued?: boolean;
}

export interface CacheEntry {
  body: string;
  status: number;
  contentRange: string | null;
  cachedAt: number;
}

const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? "";
export const REST_PREFIX = `${SUPABASE_URL}/rest/v1/`;

export function isRestUrl(url: string) {
  return !!SUPABASE_URL && url.startsWith(REST_PREFIX);
}

export function tableFromUrl(url: string) {
  const rest = url.slice(REST_PREFIX.length);
  return rest.split("?")[0].split("/")[0];
}

/* ---------------------------------- cache --------------------------------- */

export async function readCache(url: string): Promise<CacheEntry | undefined> {
  if (!isIDBAvailable) return undefined;
  try {
    return await idb.get<CacheEntry>(CACHE_STORE, url);
  } catch {
    return undefined;
  }
}

export async function writeCache(url: string, entry: CacheEntry) {
  if (!isIDBAvailable) return;
  try {
    await idb.set(CACHE_STORE, entry, url);
  } catch {
    /* quota / private mode — ignore */
  }
}

/** Apply an offline mutation to every cached GET response for the same table. */
export async function patchCachedTable(
  table: string,
  op: "insert" | "update" | "delete",
  rows: Record<string, unknown>[],
  matchIds: string[],
) {
  if (!isIDBAvailable) return;
  let keys: IDBValidKey[] = [];
  try {
    keys = await idb.keys(CACHE_STORE);
  } catch {
    return;
  }
  const prefix = `${REST_PREFIX}${table}?`;
  for (const key of keys) {
    const url = String(key);
    if (url !== `${REST_PREFIX}${table}` && !url.startsWith(prefix)) continue;
    const entry = await readCache(url);
    if (!entry) continue;
    let data: unknown;
    try {
      data = JSON.parse(entry.body);
    } catch {
      continue;
    }
    if (!Array.isArray(data)) continue;
    let next = data as Record<string, unknown>[];
    if (op === "insert") {
      next = [...rows, ...next];
    } else if (op === "update") {
      next = next.map((r) =>
        matchIds.length === 0 || matchIds.includes(String(r.id)) ? { ...r, ...rows[0] } : r,
      );
    } else {
      next = next.filter((r) => !matchIds.includes(String(r.id)));
    }
    await writeCache(url, { ...entry, body: JSON.stringify(next) });
  }
}

/* ---------------------------------- outbox -------------------------------- */

const listeners = new Set<() => void>();

export function subscribeOutbox(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emitOutboxChange() {
  listeners.forEach((l) => l());
}

export async function listOutbox(): Promise<OutboxItem[]> {
  if (!isIDBAvailable) return [];
  try {
    const items = await idb.getAll<OutboxItem>(OUTBOX_STORE);
    return items.sort((a, b) => a.createdAt - b.createdAt);
  } catch {
    return [];
  }
}

export async function enqueue(item: OutboxItem) {
  await idb.set(OUTBOX_STORE, item);
  emitOutboxChange();
}

export async function dequeue(id: string) {
  await idb.del(OUTBOX_STORE, id);
  emitOutboxChange();
}

export async function updateOutboxItem(item: OutboxItem) {
  await idb.set(OUTBOX_STORE, item);
  emitOutboxChange();
}
