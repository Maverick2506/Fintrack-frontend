import assert from "node:assert";
import { parseQuickAdd } from "./quickAddParser.js";

console.log("==================================================");
console.log("   QUICK-ADD NATURAL LANGUAGE PARSER UNIT TESTS   ");
console.log("==================================================");

const mockCards = [
  { id: "card-1", name: "Visa Infinite" },
  { id: "card-2", name: "Amex Cobalt" },
  { id: "card-3", name: "Tangerine World Mastercard" },
];

const fixedToday = new Date("2026-04-15T12:00:00Z");

// --- Test 1: Standard Card Expense ---
console.log("\n--- Test 1: Standard Card Expense (23.40 lunch visa) ---");
const t1 = parseQuickAdd("23.40 lunch visa", mockCards, fixedToday);
assert.strictEqual(t1.type, "expense");
assert.strictEqual(t1.amount, 23.40, "[PASS] Amount is 23.40");
assert.strictEqual(t1.name, "Lunch", "[PASS] Clean name is 'Lunch'");
assert.strictEqual(t1.creditCardId, "card-1", "[PASS] Matches Visa Infinite");
assert.strictEqual(t1.category, "Food & Drink", "[PASS] Categorized as 'Food & Drink'");
assert.strictEqual(t1.is_paid, true, "[PASS] Defaults to is_paid: true");
assert.strictEqual(t1.applyToBalance, true, "[PASS] Today card charge has applyToBalance: true");
assert.strictEqual(t1.date, "2026-04-15", "[PASS] Date is today");
assert.strictEqual(t1.isValid, true, "[PASS] isValid is true");

// --- Test 2: Unpaid Bill with Due Date ---
console.log("\n--- Test 2: Unpaid Bill with Due Date (120 hydro due 11/05) ---");
const t2 = parseQuickAdd("120 hydro due 11/05", mockCards, fixedToday);
assert.strictEqual(t2.type, "expense");
assert.strictEqual(t2.amount, 120, "[PASS] Amount is 120");
assert.strictEqual(t2.name, "Hydro", "[PASS] Name is 'Hydro'");
assert.strictEqual(t2.category, "Essentials", "[PASS] Category is 'Essentials'");
assert.strictEqual(t2.date, "2026-11-05", "[PASS] Date parsed as 2026-11-05");
assert.strictEqual(t2.is_paid, false, "[PASS] Flagged as is_paid: false");
assert.strictEqual(t2.accountName, "Primary Checking", "[PASS] Defaults to Primary Checking");

// --- Test 3: Income with + Prefix ---
console.log("\n--- Test 3: Income with + Prefix (+2100 paycheque) ---");
const t3 = parseQuickAdd("+2100 paycheque", mockCards, fixedToday);
assert.strictEqual(t3.type, "income", "[PASS] Identified as income");
assert.strictEqual(t3.amount, 2100, "[PASS] Amount is 2100");
assert.strictEqual(t3.name, "Paycheque", "[PASS] Name is 'Paycheque'");
assert.strictEqual(t3.category, "Income", "[PASS] Category is 'Income'");
assert.strictEqual(t3.isValid, true, "[PASS] isValid is true");

// --- Test 4: Explicit Checking Account ---
console.log("\n--- Test 4: Explicit Checking Account ($45 dinner checking) ---");
const t4 = parseQuickAdd("$45 dinner checking", mockCards, fixedToday);
assert.strictEqual(t4.amount, 45, "[PASS] Dollar sign parsed properly");
assert.strictEqual(t4.accountName, "Primary Checking", "[PASS] Account is Primary Checking");
assert.strictEqual(t4.creditCardId, null, "[PASS] creditCardId is null");
assert.strictEqual(t4.category, "Food & Drink", "[PASS] Categorized as 'Food & Drink'");

// --- Test 5: Amex Card Fuzzy Match & Due Tomorrow ---
console.log("\n--- Test 5: Amex Match & Due Tomorrow (85 internet amex due tomorrow) ---");
const t5 = parseQuickAdd("85 internet amex due tomorrow", mockCards, fixedToday);
assert.strictEqual(t5.amount, 85, "[PASS] Amount is 85");
assert.strictEqual(t5.name, "Internet", "[PASS] Name is 'Internet'");
assert.strictEqual(t5.creditCardId, "card-2", "[PASS] Matches Amex Cobalt");
assert.strictEqual(t5.date, "2026-04-16", "[PASS] Date is tomorrow (2026-04-16)");
assert.strictEqual(t5.is_paid, false, "[PASS] is_paid is false for future date");

// --- Test 6: Incomplete / Non-numeric Input ---
console.log("\n--- Test 6: Incomplete Input ---");
const t6 = parseQuickAdd("just some text", mockCards, fixedToday);
assert.strictEqual(t6.amount, null, "[PASS] Amount is null");
assert.strictEqual(t6.isValid, false, "[PASS] isValid is false");

// --- Test 7: Exact Category Names Matching CATEGORY_CONFIG (Phase L Polish) ---
console.log("\n--- Test 7: Category Names match CATEGORY_CONFIG (Transportation & Subscription) ---");
const t7a = parseQuickAdd("18.99 netflix", mockCards, fixedToday);
assert.strictEqual(t7a.category, "Subscription", "[PASS] Categorized as 'Subscription' (singular)");
const t7b = parseQuickAdd("35 uber visa", mockCards, fixedToday);
assert.strictEqual(t7b.category, "Transportation", "[PASS] Categorized as 'Transportation'");
assert.strictEqual(t7b.applyToBalance, true, "[PASS] Card charge has applyToBalance: true");

// --- Test 8: Year Boundary Wrap (due in early next year) ---
console.log("\n--- Test 8: Year Boundary Wrap (due 1/15 entered in late December) ---");
const decToday = new Date("2026-12-20T12:00:00Z");
const t8 = parseQuickAdd("90 hydro due 1/15", mockCards, decToday);
assert.strictEqual(t8.date, "2027-01-15", "[PASS] Advances year to 2027 instead of past 2026-01-15");
assert.strictEqual(t8.is_paid, false, "[PASS] Flagged as unpaid future bill");

console.log("\n==================================================");
console.log("   ALL QUICK-ADD PARSER TESTS PASSED              ");
console.log("==================================================");
