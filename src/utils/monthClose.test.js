/* global process */
import { signedCurrency, budgetUsePercent, commentaryErrorNote, monthCloseMonth } from "./monthClose.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   MONTH CLOSE UNIT TESTS                         ");
console.log("==================================================");

assert(signedCurrency(80) === "+$80.00" && signedCurrency(-110) === "-$110.00" && signedCurrency(0) === "$0.00", "changes carry their sign");
assert(signedCurrency(1234.5) === "+$1,234.50", "thousands separators");
assert(budgetUsePercent(50, 100) === 50 && budgetUsePercent(130, 100) === 100 && budgetUsePercent(-5, 100) === 0, "bar is 0-100");
assert(budgetUsePercent(10, 0) === 100 && budgetUsePercent(0, 0) === 0, "a $0 budget is full once anything is spent");
assert(
  commentaryErrorNote({ response: { status: 429, data: { error: "limit" } } }) === "limit" &&
    commentaryErrorNote({ response: { status: 503 } }) === null && commentaryErrorNote(new Error("x")) === null,
  "only the AI limit shows a note"
);
assert(
  monthCloseMonth(2026, 10, "2026-10-28") === "2026-10" && monthCloseMonth(2026, 9, "2026-10-28") === "2026-09" &&
    monthCloseMonth(2026, 11, "2026-10-28") === null,
  "a month after this one has no close"
);

console.log("\nAll month close tests passed.");
