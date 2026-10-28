import { createMemoryStore } from "./offlineQueue.js";

// IndexedDB store for the offline Quick Add queue (F10): one record per clientRef. It survives closing
// the app and signing out, so a save made offline is sent after the next sign-in too. If IndexedDB is
// blocked (private mode on some browsers), the queue lives in memory for this visit only.
const DB_NAME = "fintrack-offline";
const STORE = "quickAddQueue";

let dbPromise = null;

const openDb = () => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "clientRef" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch((err) => {
    dbPromise = null;
    throw err;
  });
  return dbPromise;
};

const run = async (mode, action) => {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = action(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(request?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
};

const indexedDbStore = {
  list: () => run("readonly", (store) => store.getAll()).then((items) => items || []),
  put: (item) => run("readwrite", (store) => store.put(item)),
  remove: (clientRef) => run("readwrite", (store) => store.delete(clientRef)),
};

const memoryStore = createMemoryStore();

// Each call tries IndexedDB and falls back to memory, so a blocked database never loses a save
const withFallback = (method) => async (...args) => {
  try {
    return await indexedDbStore[method](...args);
  } catch (err) {
    console.warn("Offline queue: IndexedDB unavailable, keeping saves in memory", err?.message);
    return memoryStore[method](...args);
  }
};

export const offlineStore = {
  list: withFallback("list"),
  put: withFallback("put"),
  remove: withFallback("remove"),
};
