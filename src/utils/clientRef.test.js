/* global process */
import {
  nextClientRef,
  isDuplicateClientRefError,
  isTimeoutError,
} from "./clientRef.js";

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

console.log("\n--- Test 5: Lost race on the clientRef index counts as saved ---");
const conflict = (error) => ({ response: { status: 409, data: { error } } });
assert(
  isDuplicateClientRefError(conflict("A duplicate clientRef already exists.")),
  "409 naming clientRef is treated as already saved"
);
assert(
  !isDuplicateClientRefError(
    conflict("Another occurrence of this recurring series is already on that date.")
  ),
  "Other 409s (recurring date clash) are still errors"
);
assert(
  !isDuplicateClientRefError({ response: { status: 500, data: { error: "clientRef" } } }),
  "Non-409 errors are still errors"
);
assert(!isDuplicateClientRefError(undefined), "Missing error is not a duplicate");

console.log("\n--- Test 6: Timeout detection ---");
assert(isTimeoutError({ code: "ECONNABORTED" }), "Axios timeout (ECONNABORTED) is a timeout");
assert(isTimeoutError({ code: "ETIMEDOUT" }), "ETIMEDOUT is a timeout");
assert(!isTimeoutError({ response: { status: 400 } }), "Validation error is not a timeout");

console.log("\nAll client ref tests passed.");
