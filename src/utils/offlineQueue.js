/**
 * Offline Quick Add queue (F10)
 *
 * A Quick Add save made with no connection is kept (in IndexedDB, see offlineStore.js) with the clientRef
 * it was given, and sent when the app is back online or opened again. The server stores one row per
 * clientRef, so sending the same queued save twice (an answer lost on a bad network, two tabs syncing,
 * a reload mid-sync) still makes one row.
 *
 * The store is any object with list(), put(item) and remove(clientRef) returning promises, so the
 * rules here run in tests with an in-memory store.
 *
 * Queued item: { clientRef, kind: "expense" | "income", payload, label, amount, queuedAt }
 */

/** The badge text: "1 waiting to sync", "2 waiting to sync", or "" when the queue is empty */
export const queueBadgeText = (count) => (count > 0 ? `${count} waiting to sync` : "");

/**
 * Whether a failed save should go in the queue instead of showing "try again": no connection
 * (offline, or the request never got an answer, timeouts included). A save that may have reached the
 * server is still safe to queue, because its clientRef stops a second row. An answer from the server
 * (4xx or 5xx) is not queued: a 4xx means the save was refused, and a 5xx shows the usual retry message.
 */
export const shouldQueueSave = (err, online = true) => {
  if (!online) return true;
  if (!err || err.response) return false;
  if (err.__CANCEL__ || err.name === "CanceledError") return false;
  return (
    err.code === "ERR_NETWORK" ||
    err.code === "ECONNABORTED" ||
    err.code === "ETIMEDOUT" ||
    err.message === "Network Error"
  );
};

/** A queued item for a Quick Add save; payload is what dashboardService.addExpense / addPaycheque sends */
export const makeQueuedSave = ({ kind, payload, label, now = Date.now() }) => {
  if (!payload?.clientRef) throw new Error("A queued save needs a clientRef");
  return {
    clientRef: payload.clientRef,
    kind: kind === "income" ? "income" : "expense",
    payload,
    label: String(label || payload.name || "").slice(0, 120),
    amount: Number(payload.amount) || 0,
    queuedAt: now,
  };
};

/** Adds a save to the queue. The same clientRef twice keeps one item (the first, with its first date). */
export const enqueueSave = async (store, item) => {
  const existing = (await store.list()).find((it) => it.clientRef === item.clientRef);
  if (existing) return existing;
  await store.put(item);
  return item;
};

// The server saw the save: stored now, or stored by an earlier send of the same clientRef
const isSaved = (err) =>
  err?.response?.status === 409 && /clientRef/i.test(String(err.response?.data?.error || ""));

/**
 * Sends every queued save, oldest first. send(item) posts it (resolves on success).
 * - saved (or a 409 for a clientRef already stored): removed from the queue
 * - refused (another 4xx): removed and reported in `failed`, so it doesn't block the rest
 * - no connection, timeout or 5xx: kept, and the rest wait for the next try (order is kept)
 * Returns { sent, failed, remaining }.
 */
export const flushQueue = async (store, send) => {
  const items = [...(await store.list())].sort((a, b) => a.queuedAt - b.queuedAt);
  const sent = [];
  const failed = [];
  for (const item of items) {
    try {
      await send(item);
      await store.remove(item.clientRef);
      sent.push(item);
    } catch (err) {
      const status = err?.response?.status;
      if (isSaved(err)) {
        await store.remove(item.clientRef);
        sent.push(item);
      } else if (status >= 400 && status < 500 && status !== 401 && status !== 408 && status !== 429) {
        await store.remove(item.clientRef);
        failed.push({ item, error: err.response?.data?.error || `Refused (${status})` });
      } else {
        break;
      }
    }
  }
  const remaining = (await store.list()).length;
  return { sent, failed, remaining };
};

/** An in-memory store with the same shape as the IndexedDB one (tests, and a fallback when IndexedDB is blocked) */
export const createMemoryStore = () => {
  const items = new Map();
  return {
    list: async () => [...items.values()].map((it) => ({ ...it })),
    put: async (item) => {
      items.set(item.clientRef, { ...item });
    },
    remove: async (clientRef) => {
      items.delete(clientRef);
    },
  };
};
