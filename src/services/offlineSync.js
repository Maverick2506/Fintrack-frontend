import toast from "react-hot-toast";
import dashboardService from "./dashboardService";
import { queryClient } from "../utils/queryClient";
import { isLoggedIn } from "../utils/auth";
import { offlineStore } from "../utils/offlineStore";
import { enqueueSave, flushQueue, makeQueuedSave } from "../utils/offlineQueue";
import { formatCurrency } from "../utils/formatUtils";

// The offline Quick Add queue for the app (F10): queue a save, count what's waiting, and send it all
// when the app is online. The rules (what is kept, dropped or retried) are in utils/offlineQueue.js.

let count = 0;
const listeners = new Set();
const setCount = (next) => {
  if (next === count) return;
  count = next;
  listeners.forEach((fn) => fn());
};

export const subscribeQueueCount = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const getQueueCount = () => count;

export const refreshQueueCount = async () => {
  try {
    setCount((await offlineStore.list()).length);
  } catch {
    // Keep the last count
  }
};

const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

/** Puts a Quick Add save in the queue (same clientRef as the save that couldn't be sent); returns the new count */
export const queueQuickAddSave = async ({ kind, payload, label }) => {
  await enqueueSave(offlineStore, makeQueuedSave({ kind, payload, label }));
  await refreshQueueCount();
  return count;
};

let running = null;

const flushOnce = async () => {
  const result = await flushQueue(offlineStore, (item) => dashboardService.sendQueuedSave(item));
  setCount(result.remaining);
  if (result.sent.length > 0) {
    queryClient.invalidateQueries();
    toast.success(
      result.sent.length === 1
        ? `Synced: ${result.sent[0].label || "1 Quick Add save"} (${formatCurrency(result.sent[0].amount)})`
        : `Synced ${result.sent.length} Quick Add saves`
    );
  }
  for (const { item, error } of result.failed) {
    toast.error(`Couldn't save "${item.label}" from the queue: ${error}`, { duration: 8000 });
  }
  return result;
};

/**
 * Sends the queue if the app is online and signed in. One sync at a time in this tab; across tabs a Web
 * Lock keeps them apart where the browser has one (the server's clientRef keeps it safe either way).
 */
export const syncOfflineQueue = async () => {
  if (running) return running;
  if (!isOnline() || !isLoggedIn()) {
    await refreshQueueCount();
    return null;
  }
  const work = async () => {
    try {
      return await flushOnce();
    } catch (err) {
      console.error("Offline queue sync failed:", err);
      await refreshQueueCount();
      return null;
    }
  };
  running = (typeof navigator !== "undefined" && navigator.locks?.request
    ? navigator.locks.request("fintrack-offline-sync", work)
    : work()
  ).finally(() => {
    running = null;
  });
  return running;
};

let started = false;
/** Called once when the signed-in app opens: counts the queue, sends it, and sends again on reconnect */
export const startOfflineSync = () => {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => syncOfflineQueue());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && count > 0) syncOfflineQueue();
  });
  refreshQueueCount().then(() => syncOfflineQueue());
};
