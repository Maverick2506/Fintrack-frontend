/* global process */
import {
  receiptFileProblem,
  merchantForQuickAdd,
  receiptDraftToQuickAddText,
  receiptFormFields,
  receiptDraftSummary,
  receiptDraftGaps,
  receiptCategory,
} from "./receiptDraft.js";
import { parseQuickAdd } from "./quickAddParser.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

const today = "2026-10-28";
const draft = { amount: 23.46, merchant: "Corner Store #204", date: "2026-10-25", taxAmount: 2.7, category: "Shopping", saved: false };

console.log("==================================================");
console.log("   RECEIPT DRAFT UNIT TESTS (AI5)                 ");
console.log("==================================================");

console.log("\n--- Test 1: Which photos can be sent ---");
assert(receiptFileProblem({ type: "image/jpeg", size: 1000 }) === null, "A JPEG under 5 MB is fine");
assert(receiptFileProblem({ type: "", name: "IMG_1.HEIC", size: 1000 }) === null, "A HEIC photo with no type is fine (the server checks the bytes)");
assert(/over 5 MB/.test(receiptFileProblem({ type: "image/png", size: 5 * 1024 * 1024 + 1 })), "Over 5 MB is refused before upload");
assert(/isn't a photo/.test(receiptFileProblem({ type: "application/pdf", size: 10 })), "A PDF is refused");
assert(/Pick a photo/.test(receiptFileProblem(null)), "No file picked");

console.log("\n--- Test 2: Quick Add text from a draft parses back to the draft ---");
const text = receiptDraftToQuickAddText(draft, today);
assert(text === "23.46 Corner Store on 2026-10-25", `Text is amount, store, past date (got "${text}")`);
const parsed = parseQuickAdd(text, [], today);
assert(
  parsed.isValid && parsed.amount === 23.46 && parsed.date === "2026-10-25" && parsed.is_paid === true && /corner store/i.test(parsed.name),
  `Quick Add reads it as a paid $23.46 at Corner Store on Oct 25 (got ${parsed.amount}, ${parsed.date}, ${parsed.name})`
);
assert(receiptDraftToQuickAddText({ ...draft, date: today }, today) === "23.46 Corner Store", "Today's receipt has no date words");
assert(receiptDraftToQuickAddText({ ...draft, date: "2026-11-02" }, today) === "23.46 Corner Store", "A future date is ignored (not a bill)");
assert(receiptDraftToQuickAddText({ amount: null, merchant: "Cafe" }, today) === "Cafe", "No total: just the store, so the user types the amount");
assert(merchantForQuickAdd("Due North Café 99 on Main") === "North Café Main", "Words Quick Add treats as dates and store numbers are left out");
assert(receiptDraftToQuickAddText({ amount: 5 }, today) === "5.00 Receipt", "No store: named Receipt");

console.log("\n--- Test 3: Add Transaction fields ---");
const fields = receiptFormFields(draft, today);
assert(fields.name === "Corner Store #204" && fields.amount === "23.46" && fields.date === "2026-10-25" && fields.category === "Shopping", "Name, amount, date and category fill the form");
const blank = receiptFormFields({ amount: null, merchant: null, date: null, category: "Other" }, today);
assert(blank.amount === "" && blank.date === today && blank.category === null && blank.name === "", "Missing values: empty amount, today, the form keeps its category");
assert(receiptCategory({ category: "Not real" }) === null, "An unknown category is ignored");

console.log("\n--- Test 4: The summary line ---");
assert(receiptDraftSummary(draft) === "From your receipt: Corner Store #204 · $23.46 incl. $2.70 tax · Oct 25", `Summary (got "${receiptDraftSummary(draft)}")`);
assert(JSON.stringify(receiptDraftGaps({ merchant: "x" })) === JSON.stringify(["total", "date"]), "Gaps say what to fill in");

console.log("\nAll receiptDraft tests passed.");
