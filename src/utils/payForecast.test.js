/* global process */
import {
  NO_INCOME_NOTE,
  describeNextPay,
  parsePlanningAmount,
  validateExpectedPay,
} from "./payForecast.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   VARIABLE PAY FORECAST UNIT TESTS               ");
console.log("==================================================");

// Card text
assert(describeNextPay(undefined) === null, "No line while the forecast loads");
const varying = describeNextPay({ incomeSource: "estimated", planningAmount: 1375, typicalAmount: 1500, nextPayday: "2026-11-09" });
assert(
  varying.kind === "pay" && varying.text === "Next pay ~$1,500 (planning with $1,375) · Nov 9",
  `Varying pay shows the typical and planning amounts (got "${varying.text}")`
);
const big = describeNextPay({ incomeSource: "estimated", planningAmount: 12345.67, typicalAmount: 23456.78, nextPayday: "2026-12-04" });
assert(big.text === "Next pay ~$23,457 (planning with $12,346) · Dec 4", `Large amounts use formatCurrency (got "${big.text}")`);
const recurring = describeNextPay({ incomeSource: "recurring", planningAmount: 2100, typicalAmount: 2100, nextPayday: "2026-11-01" });
assert(recurring.text === "Next pay $2,100 · Nov 1", `Recurring pay is a known amount, no ~ (got "${recurring.text}")`);
const expected = describeNextPay({ incomeSource: "expected-pay", planningAmount: 1000, typicalAmount: 1000, nextPayday: "2026-10-31" });
assert(expected.text === "Next pay ~$1,000 · Oct 31", `Expected pay is approximate (got "${expected.text}")`);
assert(describeNextPay({ incomeSource: "none", planningAmount: null, typicalAmount: null, nextPayday: null }).kind === "none", "No income -> the note with Set Expected pay");
assert(describeNextPay({ incomeSource: "recurring", planningAmount: null, nextPayday: null }) === null, "No payday in the horizon -> no line");
assert(NO_INCOME_NOTE === "No income in your forecast — log your paycheques or set Expected pay", "The note matches the digest");

// Amount parsing
assert(parsePlanningAmount("$1,234.50") === 1234.5, "Parses $1,234.50");
assert(parsePlanningAmount(" 900 ") === 900, "Trims spaces");
assert(parsePlanningAmount("") === null && parsePlanningAmount("abc") === null && parsePlanningAmount("-5") === null, "Empty, text and negatives are not amounts");

// Expected pay validation (today is Toronto's day)
const today = "2026-10-26";
const good = validateExpectedPay({ nextDate: "2026-11-06", cadence: "", amountRaw: "1,400" }, today);
assert(
  good.ok && good.payload.cadence === "bi-weekly" && good.payload.amount === 1400 && good.payload.nextDate === "2026-11-06",
  "A valid form defaults to every 2 weeks and sends the amount as a number"
);
assert(validateExpectedPay({ nextDate: today, cadence: "weekly", amountRaw: "500" }, today).ok, "Today is an allowed next pay date");
assert(validateExpectedPay({ nextDate: "2026-10-25", cadence: "weekly", amountRaw: "500" }, today).errors.nextDate === "Your next pay date can't be in the past.", "A past date is refused");
assert(validateExpectedPay({ nextDate: "2026-02-30", amountRaw: "500" }, today).errors.nextDate === "Pick your next pay date.", "An impossible date is refused");
assert(validateExpectedPay({ nextDate: "", amountRaw: "500" }, today).errors.nextDate === "Pick your next pay date.", "A missing date is refused");
assert(validateExpectedPay({ nextDate: "2026-11-06", amountRaw: "0" }, today).errors.amount === "The amount must be more than $0.", "$0 is refused");
assert(validateExpectedPay({ nextDate: "2026-11-06", amountRaw: "" }, today).errors.amount === "Enter the paycheque amount to plan with.", "A missing amount is refused");
assert(validateExpectedPay({ nextDate: "2026-11-06", amountRaw: "2000000" }, today).errors.amount === "That amount is too large.", "Over $1,000,000 is refused");
assert(validateExpectedPay({ nextDate: "2026-11-06", cadence: "daily", amountRaw: "50" }, today).errors.cadence === "Pick how often you're paid.", "An unknown cadence is refused");
assert(validateExpectedPay({ nextDate: "x", amountRaw: "x" }, today).payload === null, "No payload while there are errors");

console.log("\nAll variable pay forecast tests passed.");
