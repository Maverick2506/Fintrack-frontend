/* global process */
import {
  seriesNoun,
  canEndSeries,
  endSeriesConfirmMessage,
  endSeriesDoneToast,
} from "./endSeries.js";

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log("--- End series ---");
assert(seriesNoun("expense") === "charge" && seriesNoun("income") === "payment" && seriesNoun("transfer") === "payment", "Charges for expenses, payments for income and transfers");
assert(canEndSeries({ recurringGroupId: "g" }) && !canEndSeries({ recurringGroupId: null }) && !canEndSeries(null), "Only rows in a series can be ended");
assert(
  endSeriesConfirmMessage({ removedUpcomingCount: 3, removedUpcomingTotal: 48 }, "Gym") ===
    "End 'Gym'? Removes 3 upcoming charges ($48.00). Past and paid entries stay.",
  "Confirm names the series, the count and the total"
);
assert(
  endSeriesConfirmMessage({ removedUpcomingCount: 1, removedUpcomingTotal: 2100 }, "Paycheque", "income") ===
    "End 'Paycheque'? Removes 1 upcoming payment ($2,100.00). Past and paid entries stay.",
  "Income says payment"
);
assert(
  endSeriesConfirmMessage({ removedUpcomingCount: 0, removedUpcomingTotal: 0 }, "Gym") ===
    "End 'Gym'? There are no upcoming charges to remove. Past and paid entries stay.",
  "Nothing upcoming"
);
assert(endSeriesDoneToast({ removedUpcomingCount: 0 }, "Gym") === "Ended 'Gym'.", "Toast with nothing removed");
assert(
  endSeriesDoneToast({ removedUpcomingCount: 2, removedUpcomingTotal: 50 }, "Saving", "transfer") ===
    "Ended 'Saving'. Removed 2 upcoming payments ($50.00).",
  "Toast with removed rows"
);

if (failed > 0) process.exit(1);
