// Minimal IndexedDB wrapper used by the offline layer (no external deps).

const DB_NAME = "lktech-offline";
const DB_VERSION = 1;
export const CACHE_STORE = "cache";
export const OUTBOX_STORE = "outbox";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(CACHE_STORE)) db.createObjectStore(CACHE_STORE);
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) db.createObjectStore(OUTBOX_STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(store, mode);
        const request = fn(transaction.objectStore(store));
        request.onsuccess = () => resolve(request.result as T);
        request.onerror = () => reject(request.error);
      }),
  );
}

export const idb = {
  get: <T>(store: string, key: IDBValidKey) => tx<T>(store, "readonly", (s) => s.get(key)),
  getAll: <T>(store: string) => tx<T[]>(store, "readonly", (s) => s.getAll()),
  set: (store: string, value: unknown, key?: IDBValidKey) =>
    tx<void>(store, "readwrite", (s) => (key !== undefined ? s.put(value, key) : s.put(value))),
  del: (store: string, key: IDBValidKey) => tx<void>(store, "readwrite", (s) => s.delete(key)),
  keys: (store: string) => tx<IDBValidKey[]>(store, "readonly", (s) => s.getAllKeys()),
  clear: (store: string) => tx<void>(store, "readwrite", (s) => s.clear()),
};

export const isIDBAvailable = typeof indexedDB !== "undefined";
