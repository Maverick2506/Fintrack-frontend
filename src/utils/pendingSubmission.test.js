/* global process */
import {
  getClientRef,
  getClientRefForKey,
  isDuplicateClientRefError,
  isTimeoutError,
  saveMayHaveLanded,
} from "./pendingSubmission.js";
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
const parse = (text, baseDate) => parseQuickAdd(text, cards, baseDate);

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

console.log("\n--- Test 5: Retrying after midnight is still the same save ---");
// The parser's "today" is Toronto's day; here the phone is in London, where both moments are Oct 23
const savedTZ = process.env.TZ;
process.env.TZ = "Europe/London";
const beforeMidnight = new Date("2026-10-23T03:55:00Z"); // Oct 22, 23:55 Toronto
const afterMidnight = new Date("2026-10-23T04:05:00Z"); // Oct 23, 00:05 Toronto
const late = getClientRef(null, parse("4.50 coffee", beforeMidnight), makeId);
assert(parse("4.50 coffee", beforeMidnight).date !== parse("4.50 coffee", afterMidnight).date, "Test setup: the two times fall on different days");
assert(getClientRef(late.pending, parse("4.50 coffee", afterMidnight), makeId).clientRef === late.clientRef, "Entry with no date typed keeps its clientRef across midnight");
for (const text of ["120 hydro due today", "120 hydro due tomorrow"]) {
  const rel = getClientRef(null, parse(text, beforeMidnight), makeId);
  assert(getClientRef(rel.pending, parse(text, afterMidnight), makeId).clientRef === rel.clientRef, `"${text.split(" ").slice(-2).join(" ")}" keeps its clientRef across midnight`);
}
const due = getClientRef(null, parse("120 hydro due 11/05", beforeMidnight), makeId);
assert(getClientRef(due.pending, parse("120 hydro due 11/06", beforeMidnight), makeId).clientRef !== due.clientRef, "A different typed due date is a different save");
// Thu Oct 29, 23:55 -> Fri Oct 30, 00:05 Toronto: "due fri" moves from Oct 30 to Nov 6, but it is the same save
const thuNight = new Date("2026-10-30T03:55:00Z");
const friMorning = new Date("2026-10-30T04:05:00Z");
assert(parse("120 hydro due fri", thuNight).date === "2026-10-30" && parse("120 hydro due fri", friMorning).date === "2026-11-06", "Test setup: \"due fri\" is Oct 30 before midnight and Nov 6 after");
const fri = getClientRef(null, parse("120 hydro due fri", thuNight), makeId);
assert(getClientRef(fri.pending, parse("120 hydro due friday", friMorning), makeId).clientRef === fri.clientRef, "\"due fri\" keeps its clientRef across Thursday midnight");
assert(getClientRef(fri.pending, parse("120 hydro due sat", thuNight), makeId).clientRef !== fri.clientRef, "A different weekday is a different save");
if (savedTZ === undefined) delete process.env.TZ;
else process.env.TZ = savedTZ;

console.log("\n--- Test 6: Add Transaction keys on its own payload ---");
const payload = (name, amount) => JSON.stringify({ name, amount, due_date: "2026-10-23" });
const tx = getClientRefForKey(null, payload("Lunch", "12.34"), makeId);
assert(getClientRefForKey(tx.pending, payload("Lunch", "12.34"), makeId).clientRef === tx.clientRef, "Same payload after a failure reuses the clientRef");
assert(getClientRefForKey(tx.pending, payload("Lunch fixed", "12.34"), makeId).clientRef !== tx.clientRef, "Changed payload gets a new clientRef");
const real = getClientRefForKey(null, "x", () => crypto.randomUUID());
assert(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(real.clientRef), "crypto.randomUUID gives a v4 UUID (backend validates z.string().uuid())");

console.log("\n--- Test 7: Lost race on the clientRef index counts as saved ---");
const conflict = (error) => ({ response: { status: 409, data: { error } } });
assert(isDuplicateClientRefError(conflict("A duplicate clientRef already exists.")), "409 naming clientRef is treated as already saved");
assert(!isDuplicateClientRefError(conflict("Another occurrence of this recurring series is already on that date.")), "Other 409s (recurring date clash) are still errors");
assert(!isDuplicateClientRefError({ response: { status: 500, data: { error: "clientRef" } } }), "Non-409 errors are still errors");
assert(!isDuplicateClientRefError(undefined), "Missing error is not a duplicate");

console.log("\n--- Test 8: Timeout detection ---");
assert(isTimeoutError({ code: "ECONNABORTED" }), "Axios timeout (ECONNABORTED) is a timeout");
assert(isTimeoutError({ code: "ETIMEDOUT" }), "ETIMEDOUT is a timeout");
assert(!isTimeoutError({ response: { status: 400 } }), "Validation error is not a timeout");

console.log("\n--- Test 9: Which failures may still have saved ---");
assert(!saveMayHaveLanded({ response: { status: 400 } }), "A 400 validation error did not save, so the pending clientRef can go");
assert(saveMayHaveLanded({ code: "ECONNABORTED" }), "A timeout may have saved");
assert(saveMayHaveLanded({ response: { status: 500 } }), "A 500 may have saved");
assert(saveMayHaveLanded({ code: "ERR_NETWORK" }), "A network error may have saved");

console.log("\nAll pendingSubmission tests passed.");
