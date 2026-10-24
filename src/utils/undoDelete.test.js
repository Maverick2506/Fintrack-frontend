/* global process */
import {
  UNDO_TOAST_MS,
  deletedMessage,
  restoredMessage,
  deletedIdsFrom,
  seriesEndConfirmMessage,
  seriesEndConfirmFromPreview,
  seriesEndedToast,
  SERIES_END_FALLBACK_MESSAGE,
  mayEndSeries,
  purgeLabel,
  restoreResultMessages,
  trashArchivedHint,
} from "./undoDelete.js";
import { buildExampleChips, weekdayOf, cleanRecentChips } from "./quickAddExamples.js";
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
console.log("   UNDO, TRASH AND SERIES END UNIT TESTS          ");
console.log("==================================================");

// Undo toast
assert(UNDO_TOAST_MS === 10000, "Undo stays on screen for 10 s");
assert(deletedMessage(3) === "Deleted 3 transactions", "Deleted 3 transactions");
assert(deletedMessage(1) === "Deleted 1 transaction", "Deleted 1 transaction (singular)");
assert(restoredMessage(2) === "Restored 2 transactions" && restoredMessage(1) === "Restored 1 transaction", "Restored message");
assert(deletedIdsFrom(["a", "b"], { deletedCount: 1, ids: ["a"] }).join() === "a", "Undo restores only the ids the server deleted");
assert(deletedIdsFrom(["a"], undefined).join() === "a", "A single DELETE (204, no body) restores the requested id");

// Dry-run message (R4)
assert(
  seriesEndConfirmMessage({ seriesEnded: true, removedUpcomingCount: 3, removedUpcomingTotal: 48 }) ===
    "Ends the series and removes 3 upcoming charges ($48.00).",
  "Dry run: 3 upcoming charges ($48.00)"
);
assert(
  seriesEndConfirmMessage({ seriesEnded: true, removedUpcomingCount: 1, removedUpcomingTotal: 1234.5 }) ===
    "Ends the series and removes 1 upcoming charge ($1,234.50).",
  "Dry run: 1 upcoming charge, total with thousands separator"
);
assert(
  seriesEndConfirmMessage({ seriesEnded: true, removedUpcomingCount: 2, removedUpcomingTotal: 4200 }, "income") ===
    "Ends the series and removes 2 upcoming payments ($4,200.00).",
  "Dry run on income says payments"
);
assert(
  seriesEndConfirmMessage({ seriesEnded: true, removedUpcomingCount: 0, removedUpcomingTotal: 0 }) ===
    "Ends the series. There are no upcoming charges to remove.",
  "Dry run with nothing upcoming still confirms the series ends"
);
assert(seriesEndConfirmMessage({ seriesEnded: false, removedUpcomingCount: 0 }) === null, "No confirm when only this row changes");
assert(seriesEndConfirmMessage(null) === null, "No confirm without a preview");

assert(mayEndSeries({ id: "x", recurrence: "monthly" }, "none") === true, "A recurring row set to One-time may end its series");
assert(mayEndSeries({ id: "x", recurrence: "monthly", date: "2099-01-01" }, "none") === true, "Also when its date is in the future (a series that hasn't started)");
assert(mayEndSeries({ id: "x", recurrence: "none" }, "none") === false, "A one-time row never ends a series");
assert(mayEndSeries({ id: "x", recurrence: "weekly" }, "weekly") === false, "Keeping the recurrence ends nothing");
assert(mayEndSeries(null, "none") === false, "A new row ends nothing");

assert(purgeLabel("2026-11-23T05:00:00.000Z") === "Nov 23", "Purge date shows as Nov 23 (Toronto)");
assert(purgeLabel("2026-11-23T03:00:00.000Z") === "Nov 22", "Purge date uses Toronto time, not UTC");
assert(purgeLabel(null) === "" && purgeLabel("nope") === "", "No purge date, no label");

// Restore answers with archived accounts
const plainRestore = restoreResultMessages({ restoredCount: 3, ids: ["a", "b", "c"], moved: [], refused: [] });
assert(plainRestore.success.join("|") === "Restored 3 transactions" && plainRestore.error === null, "Plain restore: Restored 3 transactions");
const movedOne = restoreResultMessages({ restoredCount: 1, moved: [{ id: "a", archivedAccount: "Visa Infinite" }], refused: [] });
assert(movedOne.success.join("|") === "Restored to Checking — Visa Infinite is archived", "Unpaid row on an archived card: Restored to Checking — Visa Infinite is archived");
const mixed = restoreResultMessages({
  restoredCount: 3,
  moved: [{ archivedAccount: "Visa Infinite" }, { archivedAccount: "Visa Infinite" }],
  refused: [{ archivedAccount: "Visa Infinite", message: '"Lunch" can\'t be restored: Visa Infinite is archived, and restoring this paid transaction would change its balance.' }],
});
assert(
  mixed.success.join("|") === "Restored 1 transaction|Restored 2 to Checking — Visa Infinite is archived" &&
    mixed.error.startsWith('"Lunch" can\'t be restored: Visa Infinite is archived'),
  "Mixed restore: what came back, what moved to Checking, and the refused row by name"
);
const twoRefused = restoreResultMessages({ restoredCount: 1, moved: [], refused: [{ archivedAccount: "Visa" }, { archivedAccount: "Visa" }] });
assert(twoRefused.error === "2 paid transactions stay in the Trash: restoring them would change the balance of Visa, which is archived.", "Two refused rows are summed up with the account");
assert(restoreResultMessages({ restoredCount: 0, moved: [], refused: [] }).success.join() === "Already restored", "A double Undo says Already restored");
assert(trashArchivedHint({ archivedAccount: "Visa", restoreAction: "moveToChecking" }) === "Restores to Checking", "Trash hint: unpaid row restores to Checking");
assert(trashArchivedHint({ archivedAccount: "Visa", restoreAction: "refuse" }) === "Can't restore: it would change Visa's balance", "Trash hint: paid row can't be restored");
assert(trashArchivedHint({ archivedAccount: null }) === null, "No hint without an archived account");

assert(
  trashArchivedHint({ archivedAccount: "Old Amex", restoreAction: "refuse", refuseReason: "nothingToPay" }) ===
    "Can't restore: Old Amex is archived, so there's nothing left to pay",
  "Trash hint: an unpaid payment to an archived card has nothing left to pay"
);
const unpaidPair = restoreResultMessages({
  restoredCount: 0,
  moved: [],
  refused: [
    { archivedAccount: "Old Amex", reason: "nothingToPay", message: "x" },
    { archivedAccount: "Old Amex", reason: "nothingToPay", message: "y" },
  ],
});
assert(
  unpaidPair.error === "2 unpaid payments stay in the Trash: Old Amex is archived, so there's nothing left to pay.",
  "Two refused payments are not called paid transactions"
);
const bothKinds = restoreResultMessages({
  restoredCount: 0,
  moved: [],
  refused: [
    { archivedAccount: "Old Amex", reason: "nothingToPay", message: "Can't restore 'Payment for Old Amex': Old Amex is archived, so there's nothing left to pay." },
    { archivedAccount: "Visa", reason: "balance", message: "Can't restore 'Lunch': Visa is archived, and restoring this paid transaction would change its balance." },
  ],
});
assert(
  bothKinds.error.includes("Payment for Old Amex") && bothKinds.error.includes("'Lunch'"),
  "One refused row of each kind shows both messages"
);

const noCount = restoreResultMessages({ refused: [{ message: "x", archivedAccount: "A" }] }, 1);
assert(noCount.success.length === 0 && noCount.error === "x", "Without restoredCount, refused rows are not counted as restored");

// Series end confirm from the dry run (R4)
assert(
  seriesEndConfirmFromPreview({ seriesEnded: true, removedUpcomingCount: 3, removedUpcomingTotal: 48 }) ===
    SERIES_END_FALLBACK_MESSAGE,
  "A preview without dryRun: true (older backend saved for real) falls back to the general question"
);
assert(seriesEndConfirmFromPreview(null) === SERIES_END_FALLBACK_MESSAGE, "No preview falls back to the general question");
assert(
  seriesEndConfirmFromPreview({ dryRun: true, seriesEnded: true, removedUpcomingCount: 3, removedUpcomingTotal: 48 }) ===
    "Ends the series and removes 3 upcoming charges ($48.00).",
  "A real dry run gives the exact count and total"
);
assert(
  seriesEndConfirmFromPreview({ dryRun: true, seriesEnded: false }) === null,
  "A dry run that ends nothing needs no confirm"
);
assert(seriesEndedToast({ removedUpcomingCount: 0 }) === "Series ended.", "Toast with nothing removed");
assert(
  seriesEndedToast({ removedUpcomingCount: 2, removedUpcomingTotal: 4200 }, "income") ===
    "Series ended. Removed 2 upcoming payments ($4,200.00).",
  "Income toast says payments"
);
assert(
  seriesEndedToast({ removedUpcomingCount: 1, removedUpcomingTotal: 16 }) === "Series ended. Removed 1 upcoming charge ($16.00).",
  "Expense toast says charge"
);

// Quick Add examples (R6)
assert(weekdayOf("2026-10-23") === "fri" && weekdayOf("2026-10-25") === "sun", "Weekday of a date");
const examples = buildExampleChips("2026-10-24");
assert(examples.includes("120 hydro due tue"), "Example bill is due three days after today (Sat -> tue)");
assert(!examples.some((c) => /\d+\/\d+/.test(c)), "Examples have no fixed dates");
const hydro = parseQuickAdd("120 hydro due tue", [], new Date(2026, 9, 24, 12));
assert(hydro.date === "2026-10-27" && hydro.is_paid === false && hydro.name === "Hydro", "'120 hydro due tue' parses to next Tuesday, unpaid");
const sameDay = parseQuickAdd("50 rent due sat", [], new Date(2026, 9, 24, 12));
assert(sameDay.date === "2026-10-31", "A weekday that is today means next week ('due sat' on a Saturday)");
const fullName = parseQuickAdd("80 phone due Friday", [], new Date(2026, 9, 24, 12));
assert(fullName.date === "2026-10-30" && fullName.name === "Phone", "Full weekday names work too");
assert(parseQuickAdd("12 saturn tickets", [], new Date(2026, 9, 24, 12)).name.toLowerCase().includes("saturn"), "Words that start like a weekday are left alone without 'due'/'on'");

assert(cleanRecentChips(["120 hydro due 11/05", "9 tea", "4.50 coffee", "+2100 paycheque"]).join("|") === "9 tea", "Old sample chips are dropped from saved recents");
assert(cleanRecentChips(null).length === 0 && cleanRecentChips("x").length === 0, "Bad storage gives no recents");
assert(cleanRecentChips(["a", "b", "c", "d", "e", "f"]).length === 5, "At most 5 recents");

console.log("\nAll undo, trash and series end tests passed.");
