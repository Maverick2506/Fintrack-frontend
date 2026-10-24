/* global process */
import {
  parseStatementAmount,
  describeStatementDifference,
  buildReconcilePayload,
} from "./statementSync.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   SYNC WITH STATEMENT UNIT TESTS                 ");
console.log("==================================================");

assert(parseStatementAmount("$1,234.50") === 1234.5, "Parses $1,234.50");
assert(parseStatementAmount("-20") === -20, "Parses a negative amount (overpaid card, overdrawn Checking)");
assert(parseStatementAmount("") === null && parseStatementAmount("-") === null && parseStatementAmount("abc") === null, "Empty or non-numbers are null");
assert(parseStatementAmount("10.005") === 10.01, "Rounds to cents");

const debtUp = describeStatementDifference({ type: "DEBT", appBalance: 1000, actualRaw: "1012.34" });
assert(debtUp.difference === 12.34 && debtUp.canSave && debtUp.tone === "up", "Debt: statement higher is +$12.34");
assert(debtUp.line === "You owe $12.34 more than the app shows. Saving adds one $12.34 charge to this debt.", "Debt up preview line");

const cardDown = describeStatementDifference({ type: "CREDIT_CARD", appBalance: "250", actualRaw: "180.50" });
assert(cardDown.difference === -69.5 && cardDown.tone === "down", "Card: statement lower is -$69.50");
assert(cardDown.line.startsWith("You owe $69.50 less") && cardDown.line.includes("credit to this card"), "Card down preview line");

const checkingUp = describeStatementDifference({ type: "CHECKING", appBalance: 4000, actualRaw: "4,100" });
assert(checkingUp.line === "Your bank shows $100.00 more. Saving adds $100.00 to Checking.", "Checking up preview line");
const checkingDown = describeStatementDifference({ type: "CHECKING", appBalance: 4000, actualRaw: "3974.50" });
assert(checkingDown.line === "Your bank shows $25.50 less. Saving takes $25.50 out of Checking.", "Checking down preview line");

const same = describeStatementDifference({ type: "DEBT", appBalance: 500, actualRaw: "500.00" });
assert(same.canSave === false && same.tone === "same", "Same balance can't be saved");
const empty = describeStatementDifference({ type: "DEBT", appBalance: 500, actualRaw: "" });
assert(empty.canSave === false && empty.line === "", "Nothing typed: no preview, can't save");

assert(debtUp.allowInterest === true, "Debt owes more: interest is allowed");
assert(describeStatementDifference({ type: "CREDIT_CARD", appBalance: 100, actualRaw: "120" }).allowInterest === true, "Card owes more: interest is allowed");
const debtDown = describeStatementDifference({ type: "DEBT", appBalance: 18450.75, actualRaw: "18200" });
assert(debtDown.canSave && debtDown.allowInterest === false, "Debt statement lower (paid at the bank): interest is not allowed");
assert(cardDown.allowInterest === false, "Card statement lower: interest is not allowed");
assert(checkingUp.allowInterest === false && checkingDown.allowInterest === false, "Checking never offers interest");
assert(same.allowInterest === false && empty.allowInterest === false, "Nothing to save: no interest option");

const payload = buildReconcilePayload({ actualRaw: "$1,012.34", reason: "interest", allowInterest: true });
assert(payload.actualBalance === 1012.34 && payload.reason === "interest", "Payload has the parsed balance and reason");
assert(buildReconcilePayload({ actualRaw: "1", reason: "other", allowInterest: true }).reason === "adjustment", "Unknown reasons send adjustment");
assert(
  buildReconcilePayload({ actualRaw: "18200", reason: "interest", allowInterest: debtDown.allowInterest }).reason === "adjustment",
  "A debt sheet left on Interest sends adjustment once the statement is lower"
);

console.log("\n  All Sync with statement tests passed.");
