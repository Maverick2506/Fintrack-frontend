/* global process */
import { nextClientRef } from "./clientRef.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   CLIENT REF UNIT TESTS                          ");
console.log("==================================================");

let n = 0;
const makeId = () => `id-${++n}`;

console.log("\n--- Test 1: First submit gets a new ref ---");
const first = nextClientRef(null, "coffee|5", makeId);
assert(first.clientRef === "id-1", "No pending entry creates a new clientRef");

console.log("\n--- Test 2: Retrying the same entry reuses the ref ---");
const retry = nextClientRef(first, "coffee|5", makeId);
assert(retry.clientRef === "id-1", "Same entry keeps the same clientRef");

console.log("\n--- Test 3: A changed entry gets a fresh ref ---");
const changed = nextClientRef(retry, "coffee|6", makeId);
assert(changed.clientRef === "id-2", "Different entry gets a new clientRef");

console.log("\n--- Test 4: Default generator returns a UUID ---");
const real = nextClientRef(null, "x");
assert(
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(real.clientRef),
  "Default clientRef is a v4 UUID (backend validates z.string().uuid())"
);

console.log("\nAll client ref tests passed.");
