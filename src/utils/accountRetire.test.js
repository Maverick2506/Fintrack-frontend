/* global process */
import {
  describeDeleteImpact,
  describeUnpaidItem,
  buildRetirePayload,
  getLedgerAccountLabel,
  getLedgerAccountChip,
  getLedgerAccountLine,
  getLedgerAccountText,
  ledgerRowMatchesSearch,
} from "./accountRetire.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   ACCOUNT ARCHIVE / DELETE UNIT TESTS            ");
console.log("==================================================");

const cardImpact = {
  type: "CREDIT_CARD",
  balance: 0,
  unpaid: {
    count: 2,
    total: 67,
    items: [
      { title: "Netflix", type: "EXPENSE", recurringGroupId: "g1", movable: true, overdue: false, date: "2026-11-13", amount: 16.99 },
      { title: "Payment for Visa", type: "TRANSFER", recurringGroupId: null, movable: false, overdue: false, date: "2026-10-29", amount: 50 },
    ],
  },
  series: [{ recurringGroupId: "g1", title: "Netflix", recurrence: "monthly", movable: true }],
  canRetire: true,
};
const card = describeDeleteImpact(cardImpact);
assert(card.usedBy === "Netflix (monthly) and 1 upcoming payment use this card", `Card summary reads naturally (got "${card.usedBy}")`);
assert(card.canMove === true, "A card charge can move to Checking");
assert(card.endsAnyway === true, "The payment to the card ends even when charges move");
assert(card.balanceLine === null && card.finalPaymentLabel === null, "A $0 card needs no settling");
assert(card.canRetire === true, "A $0 card can be archived");
assert(card.unpaidCountsLine === "2 upcoming", `Counts upcoming rows (got "${card.unpaidCountsLine}")`);
assert(card.upcomingItems[0].title === "Payment for Visa", "Upcoming rows are listed by date");

const single = describeDeleteImpact({
  type: "DEBT",
  balance: 400,
  unpaid: { items: [{ title: "Payment for Loan", type: "TRANSFER", movable: false }] },
  series: [],
});
assert(single.usedBy === "1 upcoming payment uses this debt", `Single payment uses singular verb (got "${single.usedBy}")`);
assert(single.balanceLine === "$400.00 is still owed on this debt.", `Debt balance line (got "${single.balanceLine}")`);
assert(single.finalPaymentLabel === "Record final payment of $400.00", "Offers a final payment for money owed");
assert(single.canRetire === false, "A debt with money owed cannot be archived");
assert(single.canMove === false && single.endsAnyway === false, "Debt payments cannot move to Checking");

const two = describeDeleteImpact({
  type: "CREDIT_CARD",
  unpaid: {
    items: [
      { title: "Hydro", type: "EXPENSE", movable: true },
      { title: "Gas", type: "EXPENSE", movable: true },
    ],
  },
  series: [],
});
assert(two.usedBy === "2 upcoming charges use this card", "Counts loose charges");

const twoSeries = describeDeleteImpact({
  type: "CREDIT_CARD",
  unpaid: { items: [] },
  series: [
    { recurringGroupId: "a", title: "Netflix", recurrence: "monthly", movable: true },
    { recurringGroupId: "b", title: "Gym", recurrence: "yearly", movable: true },
    { recurringGroupId: "c", title: "Spotify", recurrence: "monthly", movable: true },
  ],
});
assert(twoSeries.usedBy === "Netflix (monthly), Gym (yearly) and Spotify (monthly) use this card", "Lists several series");

const empty = describeDeleteImpact({ type: "CREDIT_CARD", balance: 0, unpaid: { items: [] }, series: [] });
assert(empty.usedBy === null && empty.hasCommitments === false, "Nothing uses an unused card");

const goal = describeDeleteImpact({ type: "SAVINGS_GOAL", balance: 1250.5, unpaid: { items: [] }, series: [] });
assert(goal.finalPaymentLabel === "Move $1,250.50 back to Checking", `Goal with money offers to move it (got "${goal.finalPaymentLabel}")`);
assert(goal.balanceLine === "$1,250.50 is still in this goal.", "Goal balance line");
assert(goal.canRetire === false, "A goal with money cannot be archived");
assert(goal.noun === "goal", "Goal noun");
const credit = describeDeleteImpact({ type: "CREDIT_CARD", balance: -20, unpaid: { items: [] }, series: [] });
assert(credit.balanceLine === "This card has a $20.00 credit." && credit.finalPaymentLabel === null, "An overpaid card can only be adjusted");
assert(credit.canRetire === false, "An overpaid card cannot be archived");
const missing = describeDeleteImpact(undefined);
assert(missing.usedBy === null && missing.canRetire === false, "Missing impact (still loading) is safe and blocks archive");

const mixed = describeDeleteImpact({
  type: "CREDIT_CARD",
  balance: 0,
  canRetire: true,
  unpaid: {
    items: [
      { id: "u1", title: "Gas", type: "EXPENSE", movable: true, overdue: false, date: "2026-11-02", amount: 40 },
      { id: "o2", title: "Phone", type: "EXPENSE", movable: true, overdue: true, date: "2026-10-20", amount: 55 },
      { id: "o1", title: "Hydro", type: "EXPENSE", movable: true, overdue: true, date: "2026-10-12", amount: 80 },
    ],
  },
  series: [],
});
assert(
  mixed.usedBy === "2 overdue charges and 1 upcoming charge use this card",
  `Overdue charges are not called upcoming (got "${mixed.usedBy}")`
);
assert(mixed.unpaidCountsLine === "2 overdue, 1 upcoming", `Overdue and upcoming are counted apart (got "${mixed.unpaidCountsLine}")`);
assert(mixed.overdueItems.map((i) => i.id).join() === "o1,o2", "Overdue rows are listed oldest first");
assert(describeUnpaidItem(mixed.overdueItems[0]) === "Oct 12 · $80.00", `Unpaid row shows date and amount (got "${describeUnpaidItem(mixed.overdueItems[0])}")`);

const archivePayload = buildRetirePayload({ mode: "archive", seriesChoice: "moveToChecking" });
assert(archivePayload.mode === "archive" && archivePayload.series === "moveToChecking", "Builds the archive body");
const deletePayload = buildRetirePayload({ mode: "delete", seriesChoice: undefined });
assert(deletePayload.mode === "delete" && deletePayload.series === "end", "Delete body defaults to ending series");

assert(
  getLedgerAccountLabel({ fromAccount: "Visa", fromAccountType: "CREDIT_CARD", fromAccountArchived: true }) === "Visa (archived)",
  "Ledger labels a charge on an archived card"
);
assert(
  getLedgerAccountLabel({ fromAccount: "Primary Checking", fromAccountType: "CHECKING", toAccount: "Trip", toAccountType: "SAVINGS_GOAL", toAccountArchived: false }) === "Trip",
  "Ledger labels a contribution with its goal"
);
assert(
  getLedgerAccountLabel({ fromAccount: "Primary Checking", fromAccountType: "CHECKING" }) === null,
  "Checking-only rows get no label"
);
assert(getLedgerAccountLabel({}) === null, "Rows without accounts get no label");

// Account chip instead of the category (transfers and card rows only)
const cardBuy = getLedgerAccountChip({ type: "expense", fromAccount: "Visa", fromAccountType: "CREDIT_CARD" });
assert(cardBuy && cardBuy.type === "CREDIT_CARD" && cardBuy.label === "Visa", "A card purchase shows its card as a chip");
const cardPay = getLedgerAccountChip({ type: "transfer", fromAccount: "Primary Checking", fromAccountType: "CHECKING", toAccount: "Visa", toAccountType: "CREDIT_CARD", toAccountArchived: true });
assert(cardPay && cardPay.label === "Visa (archived)" && cardPay.archived, "A card payment shows the card it pays, marked archived");
const goalMove = getLedgerAccountChip({ type: "transfer", fromAccount: "Primary Checking", fromAccountType: "CHECKING", toAccount: "Trip", toAccountType: "SAVINGS_GOAL" });
assert(goalMove && goalMove.type === "SAVINGS_GOAL", "A savings transfer shows its goal");
const contribution = getLedgerAccountChip({ type: "expense", category: "Savings Transfer", fromAccount: "Primary Checking", fromAccountType: "CHECKING", toAccount: "Trip", toAccountType: "SAVINGS_GOAL" });
assert(contribution && contribution.label === "Trip", "A goal contribution saved as an expense still shows its goal");
assert(getLedgerAccountChip({ type: "expense", fromAccount: "Primary Checking", fromAccountType: "CHECKING" }) === null, "A checking expense keeps its category");
assert(getLedgerAccountChip({ type: "transfer", fromAccount: "Primary Checking", fromAccountType: "CHECKING" }) === null, "A transfer with no card, debt or goal keeps its category");


// "Category · Account" line in the Ledger
const checking = { fromAccount: "Primary Checking", fromAccountType: "CHECKING" };
const toChecking = { toAccount: "Primary Checking", toAccountType: "CHECKING" };
const longGoal = "Emergency Fund for Car Repairs";
assert(
  getLedgerAccountText({ type: "transfer", ...checking, toAccount: longGoal, toAccountType: "SAVINGS_GOAL" }) === `To ${longGoal}`,
  "A goal contribution reads To <goal>, without Checking"
);
assert(
  getLedgerAccountText({ type: "expense", category: "Savings Transfer", ...checking, toAccount: "Trip", toAccountType: "SAVINGS_GOAL" }) === "To Trip",
  "A goal contribution saved as an expense reads To <goal> after the category"
);
const contributionLine = getLedgerAccountLine({ type: "transfer", ...checking, toAccount: "Trip", toAccountType: "SAVINGS_GOAL" });
assert(
  contributionLine.from.type === "SAVINGS_GOAL" && contributionLine.to === null && contributionLine.direction === "to",
  "the goal keeps its type, so it gets the piggy bank glyph"
);
assert(
  getLedgerAccountText({ type: "transfer", fromAccount: longGoal, fromAccountType: "SAVINGS_GOAL", ...toChecking }) === `From ${longGoal}`,
  "A withdrawal from a goal (Move back to Checking) reads From <goal>"
);
assert(
  getLedgerAccountText({ type: "transfer", ...checking, toAccount: "Amex", toAccountType: "CREDIT_CARD" }) === "To Amex",
  "A card payment reads To <card>"
);
assert(
  getLedgerAccountText({ type: "transfer", ...checking, toAccount: "Car loan", toAccountType: "DEBT" }) === "To Car loan",
  "A debt payment reads To <debt>"
);
const cardToCard = getLedgerAccountLine({ type: "transfer", fromAccount: "Amex", fromAccountType: "CREDIT_CARD", toAccount: "Visa", toAccountType: "CREDIT_CARD" });
assert(
  getLedgerAccountText({ type: "transfer", fromAccount: "Amex", fromAccountType: "CREDIT_CARD", toAccount: "Visa", toAccountType: "CREDIT_CARD" }) === "Amex → Visa" &&
    cardToCard.direction === null && cardToCard.to.name === "Visa",
  "Card → card keeps both sides: Amex → Visa"
);
assert(
  getLedgerAccountText({ type: "expense", fromAccount: "Visa", fromAccountType: "CREDIT_CARD" }) === "Visa" &&
    getLedgerAccountLine({ type: "expense", fromAccount: "Visa", fromAccountType: "CREDIT_CARD" }).from.type === "CREDIT_CARD",
  "A card purchase shows the card, typed so it gets the card glyph"
);
assert(getLedgerAccountText({ type: "expense", ...checking }) === "Checking", "A checking purchase shows Checking");
assert(getLedgerAccountText({ type: "income", ...toChecking }) === "Checking", "Income shows the account it landed in");
assert(
  getLedgerAccountText({ type: "transfer", ...checking, toAccount: "Visa", toAccountType: "CREDIT_CARD", toAccountArchived: true }) === "To Visa (archived)",
  "An archived card keeps its name with (archived)"
);
const noAccounts = getLedgerAccountLine({ type: "expense" });
assert(noAccounts.from === null && noAccounts.to === null && getLedgerAccountText({ type: "expense" }) === "", "A row without accounts shows no account");

// Ledger search: Checking still finds rows that no longer show it
const cardPayment = { type: "transfer", name: "Payment for Amex", category: "Credit Card Payment", ...checking, toAccount: "Amex", toAccountType: "CREDIT_CARD" };
const goalWithdrawal = { type: "transfer", name: "Move back to Checking", fromAccount: "Trip", fromAccountType: "SAVINGS_GOAL", ...toChecking };
const cardToCardRow = { type: "transfer", name: "Balance transfer", fromAccount: "Amex", fromAccountType: "CREDIT_CARD", toAccount: "Visa", toAccountType: "CREDIT_CARD" };
assert(ledgerRowMatchesSearch(cardPayment, "checking"), "Searching Checking finds a card payment that reads To Amex");
assert(ledgerRowMatchesSearch({ ...goalWithdrawal, name: "Trip refund" }, "Checking"), "Searching Checking finds a goal withdrawal that reads From Trip");
assert(ledgerRowMatchesSearch(cardPayment, "primary checking"), "The full account name matches too");
assert(!ledgerRowMatchesSearch(cardToCardRow, "checking"), "Card → card does not match Checking");
assert(ledgerRowMatchesSearch(cardToCardRow, "visa") && ledgerRowMatchesSearch(cardPayment, "to amex"), "Account names and the shown label match");
assert(ledgerRowMatchesSearch(cardPayment, "") && !ledgerRowMatchesSearch(cardPayment, "groceries"), "Empty search matches; unrelated text does not");

console.log("All account archive tests passed.");
