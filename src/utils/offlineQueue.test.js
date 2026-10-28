/* global process */
import {
  queueBadgeText,
  shouldQueueSave,
  makeQueuedSave,
  enqueueSave,
  flushQueue,
  createMemoryStore,
} from "./offlineQueue.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

// A pretend server with the backend's clientRef rule: one row per clientRef, a repeat gets the stored row
const makeServer = () => {
  const rows = new Map();
  return {
    rows,
    post: (item) => {
      if (rows.has(item.clientRef)) return { ...rows.get(item.clientRef), isDuplicate: true };
      const row = { id: `row-${rows.size + 1}`, ...item.payload };
      rows.set(item.clientRef, row);
      return row;
    },
  };
};
const networkError = () => Object.assign(new Error("Network Error"), { code: "ERR_NETWORK" });
const coffee = (ref, now = 1) =>
  makeQueuedSave({
    kind: "expense",
    payload: { name: "Coffee", amount: 4.25, due_date: "2026-10-27", is_paid: true, clientRef: ref },
    label: "4.25 coffee",
    now,
  });

console.log("==================================================");
console.log("   OFFLINE QUICK ADD QUEUE UNIT TESTS (F10)       ");
console.log("==================================================");

(async () => {
  console.log("\n--- Test 1: The badge text ---");
  assert(queueBadgeText(0) === "", "No badge when nothing is waiting");
  assert(queueBadgeText(1) === "1 waiting to sync", "1 waiting to sync");
  assert(queueBadgeText(2) === "2 waiting to sync", "2 waiting to sync");

  console.log("\n--- Test 2: Which failures go in the queue ---");
  assert(shouldQueueSave(null, false), "Offline: queue without trying");
  assert(shouldQueueSave(networkError()), "A network error (no answer) is queued");
  assert(shouldQueueSave({ code: "ECONNABORTED" }), "A timeout is queued (its clientRef makes a resend safe)");
  assert(!shouldQueueSave({ response: { status: 400 } }), "A 400 is a refusal, not queued");
  assert(!shouldQueueSave({ response: { status: 500 } }), "A 500 answered, so the usual retry message shows");
  assert(!shouldQueueSave({ __CANCEL__: true, message: "Session expired" }), "A cancelled request (signed out) is not queued");

  console.log("\n--- Test 3: Queueing keeps the clientRef, and one item per clientRef ---");
  const store = createMemoryStore();
  await enqueueSave(store, coffee("ref-a", 1));
  await enqueueSave(store, coffee("ref-a", 2));
  await enqueueSave(store, coffee("ref-b", 3));
  const queued = await store.list();
  assert(queued.length === 2, "Saving the same entry twice offline queues it once");
  assert(queued[0].clientRef === "ref-a" && queued[0].payload.clientRef === "ref-a" && queued[0].queuedAt === 1, "The item keeps its clientRef and first queue time");
  let threw = false;
  try {
    makeQueuedSave({ kind: "expense", payload: { name: "x", amount: 1 } });
  } catch {
    threw = true;
  }
  assert(threw, "A save without a clientRef can't be queued");

  console.log("\n--- Test 4: Replaying a queued save twice creates one row ---");
  const server = makeServer();
  // First sync: the server stores the row but the answer is lost, so the item stays queued
  let lose = true;
  const flaky = async (item) => {
    server.post(item);
    if (lose && item.clientRef === "ref-a") {
      lose = false;
      throw networkError();
    }
  };
  const first = await flushQueue(store, flaky);
  assert(first.sent.length === 0 && first.remaining === 2, "An answer lost mid-sync keeps that save (and the ones after it) queued");
  const second = await flushQueue(store, flaky);
  assert(second.sent.length === 2 && second.remaining === 0, "The next sync sends both and empties the queue");
  assert(server.rows.size === 2, `The replayed save made one row, not two (rows: ${server.rows.size})`);

  console.log("\n--- Test 5: Two syncs at once (two tabs) still make one row ---");
  const shared = createMemoryStore();
  await enqueueSave(shared, coffee("ref-c", 1));
  const server2 = makeServer();
  const slowSend = async (item) => {
    await new Promise((r) => setTimeout(r, 5));
    server2.post(item);
  };
  await Promise.all([flushQueue(shared, slowSend), flushQueue(shared, slowSend)]);
  assert(server2.rows.size === 1 && (await shared.list()).length === 0, "Both syncs sent it; the server kept one row");

  console.log("\n--- Test 6: What a sync does with each answer ---");
  const mixed = createMemoryStore();
  await enqueueSave(mixed, coffee("dup", 1));
  await enqueueSave(mixed, coffee("bad", 2));
  await enqueueSave(mixed, coffee("down", 3));
  await enqueueSave(mixed, coffee("later", 4));
  const answers = {
    dup: { response: { status: 409, data: { error: "A duplicate clientRef already exists." } } },
    bad: { response: { status: 400, data: { error: "Amount must be positive" } } },
    down: { response: { status: 503 } },
  };
  const sentRefs = [];
  const result = await flushQueue(mixed, async (item) => {
    if (answers[item.clientRef]) throw answers[item.clientRef];
    sentRefs.push(item.clientRef);
  });
  assert(result.sent.map((s) => s.clientRef).join() === "dup", "A 409 on the clientRef means it is already saved: off the queue");
  assert(result.failed.length === 1 && result.failed[0].error === "Amount must be positive", "A refused save (400) is dropped and reported");
  assert(result.remaining === 2 && sentRefs.length === 0, "A 503 stops the sync; it and the newer save wait, in order");
  const signedOut = createMemoryStore();
  await enqueueSave(signedOut, coffee("auth", 1));
  const afterAuth = await flushQueue(signedOut, async () => {
    throw { response: { status: 401 } };
  });
  assert(afterAuth.remaining === 1 && afterAuth.failed.length === 0, "Signed out (401): the save waits for the next sign-in");

  console.log("\nAll offlineQueue tests passed.");
})();
