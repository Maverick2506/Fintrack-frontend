/* global process */
import {
  describeDeleteImpact,
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
      { title: "Netflix", type: "EXPENSE", recurringGroupId: "g1", movable: true },
      { title: "Payment for Visa", type: "TRANSFER", recurringGroupId: null, movable: false },
    ],
  },
  series: [{ recurringGroupId: "g1", title: "Netflix", recurrence: "monthly", movable: true }],
};
const card = describeDeleteImpact(cardImpact);
assert(card.usedBy === "Netflix (monthly) and 1 upcoming payment use this card", `Card summary reads naturally (got "${card.usedBy}")`);
assert(card.canMove === true, "A card charge can move to Checking");
assert(card.endsAnyway === true, "The payment to the card ends even when charges move");
assert(card.goalBalanceLine === null, "Cards never offer to move a balance");

const single = describeDeleteImpact({
  type: "DEBT",
  balance: 400,
  unpaid: { items: [{ title: "Payment for Loan", type: "TRANSFER", movable: false }] },
  series: [],
});
assert(single.usedBy === "1 upcoming payment uses this debt", `Single payment uses singular verb (got "${single.usedBy}")`);
assert(
  single.owedLine === "$400.00 is still owed on this debt. It will no longer count in your net worth.",
  `Warns about a debt balance (got "${single.owedLine}")`
);
assert(card.owedLine === null, "No warning for a card with nothing owed");
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
assert(goal.goalBalanceLine === "Move $1,250.50 back to Checking?", `Goal with money offers to move it (got "${goal.goalBalanceLine}")`);
assert(goal.noun === "goal", "Goal noun");
const emptyGoal = describeDeleteImpact({ type: "SAVINGS_GOAL", balance: 0, unpaid: { items: [] }, series: [] });
assert(emptyGoal.goalBalanceLine === null, "Empty goal has nothing to move");
assert(describeDeleteImpact(undefined).usedBy === null, "Missing impact (still loading) is safe");

const archivePayload = buildRetirePayload({ mode: "archive", seriesChoice: "moveToChecking", moveBalance: true });
assert(
  archivePayload.mode === "archive" && archivePayload.series === "moveToChecking" && archivePayload.moveBalanceToChecking === true,
  "Builds the archive body"
);
const deletePayload = buildRetirePayload({ mode: "delete", seriesChoice: undefined, moveBalance: undefined });
assert(
  deletePayload.mode === "delete" && deletePayload.series === "end" && deletePayload.moveBalanceToChecking === false,
  "Delete body defaults to ending series and keeping the balance"
);

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
