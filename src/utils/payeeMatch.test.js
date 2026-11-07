/* global process */
import { payeeKey, titleCaseWords, findPayee, applyPayeeToQuickAdd } from "./payeeMatch.js";
import { parseQuickAdd } from "./quickAddParser.js";
import { applyRulesToQuickAdd } from "./csvImport.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("\n--- payeeMatch: Quick Add uses your payee spelling ---");

// Same key as the server's normalizePayeeTitle
assert(payeeKey("TIM HORTONS #4521") === "tim hortons", "Store numbers come off the key");
assert(payeeKey("Hydro Oct 2026") === "hydro", "Month and year come off the key");
assert(payeeKey("Café  Milano") === "cafe milano", "Accents and spacing are ignored");
assert(payeeKey("7-Eleven") === "7-eleven", "Digits inside a word stay");

assert(titleCaseWords("tim hortons") === "Tim Hortons", "Lowercase words are title-cased");
assert(titleCaseWords("lunch at IKEA") === "Lunch At IKEA", "Words with capitals keep them");
assert(titleCaseWords("mcDonald's") === "mcDonald's", "Mixed case is left as typed");

const payees = [
  { key: "tim hortons", type: "expense", name: "Tim Hortons", category: "Food & Drink", count: 12 },
  { key: "ikea", type: "expense", name: "IKEA", category: "Shopping", count: 3 },
  { key: "bean co", type: "expense", name: "Bean Co", category: "Food & Drink", count: 2 },
  { key: "corner shop", type: "expense", name: "Corner Shop", category: "Other", count: 2 },
  { key: "acme payroll", type: "income", name: "ACME Payroll", category: "Income", count: 4 },
];
const today = "2026-11-06";
const run = (text, cards = [], extra = (p) => p) => {
  const typed = parseQuickAdd(text, cards, today);
  return applyPayeeToQuickAdd(extra(typed), typed, payees);
};

const tim = run("4.50 TIM HORTONS");
assert(tim.name === "Tim Hortons" && tim.category === "Food & Drink", `Known payee: its spelling (got ${tim.name}, ${tim.category})`);
const beanCo = run("5 BEAN co");
assert(beanCo.name === "Bean Co" && beanCo.category === "Food & Drink" && beanCo.payeeCategory === true, `Known payee with no keyword: its usual category (got ${beanCo.name}, ${beanCo.category})`);
const ikea = run("80 ikea");
assert(ikea.name === "IKEA" && ikea.category === "Shopping", `Payee spelling with capitals wins (got ${ikea.name})`);

// A keyword category beats the payee's usual one
const timCoffee = parseQuickAdd("4.50 tim hortons", [], today);
const timTyped = { ...timCoffee, category: "Entertainment" };
const timKeyword = applyPayeeToQuickAdd(timTyped, timTyped, payees);
assert(timKeyword.category === "Entertainment" && timKeyword.name === "Tim Hortons", "A keyword category stays; the spelling still changes");

// A rule's category beats it too (real rules, as Quick Add applies them)
const visa = [{ id: "c1", name: "Visa" }];
const withRules = (text, rules) => {
  const typed = parseQuickAdd(text, visa, today);
  return applyPayeeToQuickAdd(applyRulesToQuickAdd(typed, rules, visa, today), typed, payees);
};
const ruled = withRules("80 ikea", [{ match: "ikea", category: "Essentials", priority: 1 }]);
assert(ruled.category === "Essentials" && ruled.name === "IKEA", `A rule's category stays (got ${ruled.category})`);

// A rule that only sets the card doesn't decide the category: the payee's usual one stays (review Required 1)
const cardOnly = withRules("80 ikea", [{ match: "ikea", accountId: "c1", priority: 1 }]);
assert(
  cardOnly.category === "Shopping" && cardOnly.creditCardId === "c1" && cardOnly.name === "IKEA",
  `A card-only rule keeps the payee's category and sets the card (got ${cardOnly.category}, ${cardOnly.creditCardId})`
);

// "Other" is never copied over a real choice
const corner = run("5 corner shop");
assert(corner.name === "Corner Shop" && corner.category === "Other" && !corner.payeeCategory, "An Other payee doesn't set the category");

// Unknown payee: title-case each word
const unknown = run("12 river store");
assert(unknown.name === "River Store" && !unknown.payeeMatched, `Unknown payee is title-cased (got ${unknown.name})`);

// Income matches income payees only
const pay = run("+2100 acme payroll");
assert(pay.name === "ACME Payroll" && pay.category === "Income", `Income payee spelling (got ${pay.name}, ${pay.category})`);
assert(findPayee(payees, "acme payroll", "expense") === null, "An income payee isn't used for an expense");

// Card words are gone before matching
const cards = [{ id: "c1", name: "Visa" }];
const onCard = run("4.50 tim hortons visa", cards);
assert(onCard.name === "Tim Hortons" && onCard.creditCardId === "c1", "Card word removed, payee still matched");

// Amount only: the name is a category stand-in and stays as is
const amountOnly = run("25");
assert(amountOnly.name === "Expense", `Amount only keeps the stand-in name (got ${amountOnly.name})`);

// No payee list (offline, still loading): title-case only
const noList = applyPayeeToQuickAdd(parseQuickAdd("9 river walk", [], today), parseQuickAdd("9 river walk", [], today), undefined);
assert(noList.name === "River Walk" && noList.category === "Other", "Without a payee list the name is title-cased");

console.log("\npayeeMatch tests passed.");
