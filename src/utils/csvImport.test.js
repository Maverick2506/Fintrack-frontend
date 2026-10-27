/* global process */
import {
  importCountsLine,
  isMappingComplete,
  rowOutcome,
  countOutcomes,
  buildCommitRows,
  applyRules,
  applyRulesToQuickAdd,
  suggestRuleMatch,
  columnOptionLabel,
} from "./csvImport.js";
import { parseQuickAdd } from "./quickAddParser.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   CSV IMPORT AND RULES UNIT TESTS                ");
console.log("==================================================");

assert(importCountsLine({ matched: 2, new: 5, skipped: 1 }) === "2 matched · 5 new · 1 skipped", "counts line lists each count");
assert(importCountsLine({ matched: 0, new: 0, skipped: 8 }) === "0 new · 8 skipped", "zeros left out, except new");

const tdMap = { hasHeader: false, date: 0, description: [1], debit: 2, credit: 3, dateFormat: "MM/DD/YYYY" };
assert(isMappingComplete(tdMap), "debit and credit columns make a complete mapping");
assert(isMappingComplete({ ...tdMap, debit: null, credit: null, amount: 2 }), "one amount column makes a complete mapping");
assert(!isMappingComplete({ ...tdMap, credit: null }), "a debit column without credit is incomplete");
assert(!isMappingComplete({ ...tdMap, description: [] }), "no description is incomplete");

const rows = [
  { line: 2, status: "match", date: "2026-09-07", description: "HYDRO", amount: 85.4, direction: "out", occurrence: 1, category: "Essentials" },
  { line: 3, status: "new", date: "2026-09-02", description: "TIM", amount: 4.5, direction: "out", occurrence: 1, category: "Other" },
  { line: 4, status: "new", date: "2026-09-02", description: "TIM", amount: 4.5, direction: "out", occurrence: 2, category: "Other" },
  { line: 5, status: "duplicate", date: "2026-09-03", description: "OLD", amount: 9, direction: "out", occurrence: 1, category: null },
];
const edits = { 2: { unmatch: true }, 3: { category: "Food & Drink" }, 4: { skip: true } };
assert(rowOutcome(rows[0]) === "match" && rowOutcome(rows[0], edits[2]) === "new", "an unmatched row imports as new");
assert(rowOutcome(rows[3], { skip: false }) === "skip", "a duplicate is always skipped");
const c = countOutcomes(rows, edits);
assert(c.matched === 0 && c.new === 2 && c.skipped === 2, "counts follow the edits");
const commit = buildCommitRows(rows, edits);
assert(commit.length === 4, "every row is sent, in file order");
assert(commit[0].matchId === null && !("matchId" in commit[1]), "matchId: null only on an unmatched match");
assert(commit[1].category === "Food & Drink" && commit[2].skip === true && commit[2].occurrence === 2, "category edits, skips and repeat numbers are sent");

const rules = [
  { id: "a", match: "uber eats", category: "Food & Drink", accountId: "card-1", priority: 20 },
  { id: "b", match: "UBER", category: "Transportation", accountId: null, priority: 10 },
];
const r1 = applyRules(rules, "Uber Eats order");
assert(r1.category === "Transportation" && r1.accountId === "card-1", "lowest priority number wins the category; the account comes from the next rule that sets one");
assert(applyRules(rules, "Lyft").category === null, "no match, nothing set");

const cards = [{ id: "card-1", name: "Visa Infinite" }];
const today = new Date("2026-04-15T12:00:00Z");
const qa = applyRulesToQuickAdd(parseQuickAdd("12 uber eats", cards, today), [{ match: "uber eats", category: "Food & Drink", accountId: "card-1", priority: 1 }], cards, "2026-04-15");
assert(qa.category === "Food & Drink" && qa.creditCardId === "card-1" && qa.applyToBalance === true && qa.ruleApplied, "Quick Add: a rule fills the category and card the text left out");
const qaTyped = applyRulesToQuickAdd(parseQuickAdd("12 uber eats checking", cards, today), [{ match: "uber eats", category: "Food & Drink", accountId: "card-1", priority: 1 }], cards, "2026-04-15");
assert(qaTyped.category === "Food & Drink" && qaTyped.creditCardId === null, "Quick Add: the rule beats the built-in keyword (uber = Transportation); a typed account beats the rule");
const qaNoRule = applyRulesToQuickAdd(parseQuickAdd("12 uber", cards, today), [{ match: "lyft", category: "Other", priority: 1 }], cards, "2026-04-15");
assert(qaNoRule.category === "Transportation" && !qaNoRule.ruleApplied, "Quick Add: no matching rule keeps the keyword category");
const qaIncome = parseQuickAdd("+100 uber refund", cards, today);
assert(applyRulesToQuickAdd(qaIncome, rules, cards, "2026-04-15") === qaIncome, "Quick Add: income is left alone");

assert(suggestRuleMatch("TIM HORTONS #0001") === "tim hortons", "rule text from a bank description drops the store number");
assert(suggestRuleMatch("POS PURCHASE GROCERY MART 0042 TORONTO") === "grocery mart", "terminal words are dropped");
assert(suggestRuleMatch("SQ *COFFEE BAR") === "sq coffee", "punctuation is dropped");
assert(suggestRuleMatch("7-11") === "7-11", "falls back to the title when no word is left");

assert(columnOptionLabel(["Date", "Description"], [["Date", "Description"], ["9/1/2026", "TIM"]], true, 1) === "Description · TIM", "column label shows the first value");
assert(columnOptionLabel(["Column 1"], [["9/1/2026"]], false, 0) === "Column 1 · 9/1/2026", "no header: Column N and its value");

console.log("\n   CSV IMPORT AND RULES UNIT TESTS: all passed\n");
