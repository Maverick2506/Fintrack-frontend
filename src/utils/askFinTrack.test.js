/* global process */
import { loadAskHistory, saveAskHistory, ASK_HISTORY_KEY, ASK_HISTORY_MAX } from "./askFinTrack.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

const memoryStorage = () => {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
};

console.log("==================================================");
console.log("   ASK FINTRACK SESSION HISTORY UNIT TESTS        ");
console.log("==================================================");

const storage = memoryStorage();
assert(loadAskHistory(storage).length === 0, "a new tab starts with an empty chat");

const chat = [
  { role: "user", text: "Can I afford $300?" },
  { role: "model", text: "Yes, **$412** stays above your buffer." },
];
saveAskHistory(storage, chat);
const restored = loadAskHistory(storage);
assert(restored.length === 2 && restored[1].text === chat[1].text, "the chat comes back after closing and reopening");

saveAskHistory(storage, []);
assert(storage.getItem(ASK_HISTORY_KEY) === null, "clearing the chat removes it from the tab");

storage.setItem(ASK_HISTORY_KEY, "{not json");
assert(loadAskHistory(storage).length === 0, "a damaged entry is ignored");
storage.setItem(ASK_HISTORY_KEY, JSON.stringify([{ role: "user", text: "hi" }, { role: "system", text: "x" }, null, { role: "model" }]));
assert(loadAskHistory(storage).length === 1, "entries that are not chat messages are dropped");

const long = Array.from({ length: ASK_HISTORY_MAX + 10 }, (_, i) => ({ role: "user", text: String(i) }));
saveAskHistory(storage, long);
const kept = loadAskHistory(storage);
assert(kept.length === ASK_HISTORY_MAX && kept[0].text === "10", "only the latest messages are kept");

const throwing = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("full"); }, removeItem: () => {} };
assert(loadAskHistory(throwing).length === 0, "blocked storage reads as an empty chat");
saveAskHistory(throwing, chat);
assert(true, "a full or blocked storage does not break saving");
assert(loadAskHistory(undefined).length === 0, "no storage at all reads as an empty chat");

console.log("All Ask FinTrack history tests passed.");
