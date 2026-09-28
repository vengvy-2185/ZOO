// A very small IndexedDB helper for work done without internet.
// Stores: "ops" (work waiting to be sent), "kv" (downloaded lists, notes),
// "log" (what happened when waiting work was sent).

const DB = "gwz-offline";
const VERSION = 1;
export type Store = "ops" | "kv" | "log";

let opening: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no indexedDB"));
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("ops")) d.createObjectStore("ops", { keyPath: "id" });
      if (!d.objectStoreNames.contains("kv")) d.createObjectStore("kv", { keyPath: "k" });
      if (!d.objectStoreNames.contains("log")) d.createObjectStore("log", { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      opening = null;
      reject(req.error);
    };
  });
  return opening;
}

function run<T>(store: Store, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest | void): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve((req ? req.result : undefined) as T);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

export const idbAll = <T>(store: Store) => run<T[]>(store, "readonly", (s) => s.getAll()).catch(() => [] as T[]);
export const idbGet = <T>(store: Store, key: string) => run<T | undefined>(store, "readonly", (s) => s.get(key)).catch(() => undefined);
export const idbPut = (store: Store, value: unknown) => run<void>(store, "readwrite", (s) => s.put(value));
export const idbDelete = (store: Store, key: string) => run<void>(store, "readwrite", (s) => s.delete(key)).catch(() => {});
export const idbClear = (store: Store) => run<void>(store, "readwrite", (s) => s.clear()).catch(() => {});
