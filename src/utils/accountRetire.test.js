/* global process */
import {
  describeDeleteImpact,
  describeUnpaidItem,
  buildRetirePayload,
  getLedgerAccountLabel,
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

console.log("All account archive tests passed.");
