import {
  enqueue,
  isRestUrl,
  patchCachedTable,
  readCache,
  tableFromUrl,
  writeCache,
  type OutboxItem,
} from "./store";
import { scheduleSync } from "./sync";
import { isBackgroundSyncAvailable } from "./swSync";

const MUTATING = ["POST", "PATCH", "PUT", "DELETE"];

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", "X-Offline-Response": "true" },
  });
}

function idsFromUrl(url: string): string[] {
  const query = url.split("?")[1];
  if (!query) return [];
  const params = new URLSearchParams(query);
  const ids: string[] = [];
  const id = params.get("id");
  if (id?.startsWith("eq.")) ids.push(id.slice(3));
  if (id?.startsWith("in.")) ids.push(...id.slice(3).replace(/[()"]/g, "").split(","));
  return ids;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    if (key.toLowerCase() === "authorization") return; // refreshed at sync time
    out[key] = value;
  });
  return out;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `off-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function queueMutation(
  url: string,
  method: string,
  request: Request,
  originalFetch: typeof fetch,
): Promise<Response> {
  // If a service worker is controlling the page, let the request reach it so
  // Workbox's Background Sync queue can retry it even while the app is closed.
  const handOffToSW = isBackgroundSyncAvailable();
  const table = tableFromUrl(url);
  const rawBody = MUTATING.includes(method) && method !== "DELETE" ? await request.clone().text() : null;

  let payload: Record<string, unknown>[] = [];
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      payload = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      payload = [];
    }
  }

  const now = new Date().toISOString();
  let queuedBody = rawBody;
  let optimisticRows: Record<string, unknown>[] = [];

  if (method === "POST") {
    const withIds = payload.map((row) => ({ id: row.id ?? newId(), ...row }));
    queuedBody = JSON.stringify(Array.isArray(JSON.parse(rawBody || "[]")) ? withIds : withIds[0]);
    optimisticRows = withIds.map((row) => ({ created_at: now, updated_at: now, ...row }));
  } else if (method === "PATCH" || method === "PUT") {
    optimisticRows = [{ ...(payload[0] ?? {}), updated_at: now }];
  }

  const item: OutboxItem = {
    id: newId(),
    url,
    method,
    headers: headersToObject(new Headers(request.headers)),
    body: queuedBody,
    table,
    createdAt: Date.now(),
    attempts: 0,
    swQueued: handOffToSW,
  };
  await enqueue(item);

  if (handOffToSW) {
    void originalFetch(request.clone()).catch(() => {
      /* expected while offline — the service worker has queued it */
    });
  }

  const matchIds = idsFromUrl(url);
  if (method === "POST") await patchCachedTable(table, "insert", optimisticRows, []);
  else if (method === "DELETE") await patchCachedTable(table, "delete", [], matchIds);
  else await patchCachedTable(table, "update", optimisticRows, matchIds);

  scheduleSync();

  if (method === "DELETE") return jsonResponse([], 200);
  return jsonResponse(optimisticRows, method === "POST" ? 201 : 200);
}

let installed = false;

/** Patches window.fetch so all PostgREST traffic is cached and queued while offline. */
export function installOfflineInterceptor() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const originalFetch = window.fetch.bind(window);
  (window as unknown as { __originalFetch: typeof fetch }).__originalFetch = originalFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const request = new Request(input as RequestInfo, init);
    const url = request.url;
    const method = request.method.toUpperCase();

    if (!isRestUrl(url)) return originalFetch(input as RequestInfo, init);

    // Reads: network first, fall back to the local cache.
    if (method === "GET" || method === "HEAD") {
      if (navigator.onLine) {
        try {
          const response = await originalFetch(request.clone());
          if (response.ok && method === "GET") {
            const clone = response.clone();
            const body = await clone.text();
            await writeCache(url, {
              body,
              status: response.status,
              contentRange: response.headers.get("content-range"),
              cachedAt: Date.now(),
            });
          }
          return response;
        } catch {
          /* fall through to cache */
        }
      }
      const cached = await readCache(url);
      if (cached) {
        return new Response(cached.body, {
          status: cached.status,
          headers: {
            "Content-Type": "application/json",
            "X-Offline-Cache": "true",
            ...(cached.contentRange ? { "Content-Range": cached.contentRange } : {}),
          },
        });
      }
      return jsonResponse([], 200);
    }

    // Writes: try the network, queue on failure.
    if (MUTATING.includes(method)) {
      if (!navigator.onLine) return queueMutation(url, method, request, originalFetch);
      try {
        return await originalFetch(request.clone());
      } catch {
        return queueMutation(url, method, request, originalFetch);
      }
    }

    return originalFetch(input as RequestInfo, init);
  };
}
