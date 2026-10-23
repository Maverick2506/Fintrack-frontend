/* global process */
import { getClientRef } from "./pendingSubmission.js";
import { parseQuickAdd } from "./quickAddParser.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

let counter = 0;
const makeId = () => `ref-${++counter}`;
const cards = [{ id: "card-1", name: "Visa" }];
const parse = (text) => parseQuickAdd(text, cards);

console.log("==================================================");
console.log("   QUICK ADD RETRY (clientRef) UNIT TESTS         ");
console.log("==================================================");

console.log("\n--- Test 1: Retrying the same entry after a failure reuses the clientRef (N2) ---");
const first = getClientRef(null, parse("23.40 lunch visa"), makeId);
const retry = getClientRef(first.pending, parse("23.40 lunch visa"), makeId);
assert(retry.clientRef === first.clientRef, "Same entry after a failed save sends the same clientRef");

console.log("\n--- Test 2: A different entry gets a new clientRef ---");
const other = getClientRef(first.pending, parse("4.50 coffee"), makeId);
assert(other.clientRef !== first.clientRef, "Different entry gets a new clientRef");
const otherAmount = getClientRef(first.pending, parse("23.41 lunch visa"), makeId);
assert(otherAmount.clientRef !== first.clientRef, "Different amount gets a new clientRef");

console.log("\n--- Test 3: After a successful save (pending cleared) the same text gets a new clientRef ---");
const afterSuccess = getClientRef(null, parse("23.40 lunch visa"), makeId);
assert(afterSuccess.clientRef !== first.clientRef, "Deliberate repeat after success is a new save");

console.log("\n--- Test 4: Whitespace, case and amount formatting don't change the entry ---");
const a = getClientRef(null, parse("7 coffee"), makeId);
assert(getClientRef(a.pending, parse("  7 coffee  "), makeId).clientRef === a.clientRef, "Surrounding whitespace is ignored");
assert(getClientRef(a.pending, parse("7.00 Coffee"), makeId).clientRef === a.clientRef, "\"7\" vs \"7.00\" and letter case are the same entry");

console.log("\nAll pendingSubmission tests passed.");
