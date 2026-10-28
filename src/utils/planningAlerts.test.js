/* global process */
import {
  parseStatementDay,
  statementLines,
  statementDayLabel,
  sinkingFundLine,
  sinkingFundNote,
  canSetUpTransfer,
  billOptions,
  suggestionText,
  suggestionAcceptedToast,
} from "./planningAlerts.js";

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

console.log("--- Statement cycles, sinking funds, suggestions ---");
assert(parseStatementDay("").value === null && !parseStatementDay("").error, "An empty statement day clears it");
assert(parseStatementDay("15").value === 15 && parseStatementDay(31).value === 31, "1-31 is accepted");
assert(["0", "32", "2.5", "x"].every((v) => parseStatementDay(v).error), "0, 32, fractions and text are refused");

const lines = statementLines({ statementDate: "2026-10-15", dueDate: "2026-11-10", statementBalance: 1234.5, newCharges: 89 });
assert(
  lines.balanceText === "Statement balance $1,234.50 due Nov 10" && lines.chargesText === "New charges since Oct 15 $89.00",
  `Card lines (got "${lines.balanceText}" / "${lines.chargesText}")`
);
assert(statementLines(null) === null, "No statement day, no lines");
assert(
  statementLines({ statementDate: "2026-02-28", dueDate: null, statementBalance: 0, newCharges: -20 }).balanceText ===
    "Statement balance $0.00" && statementLines({ statementDate: "2026-02-28", statementBalance: 0, newCharges: 0 }).paid,
  "No due date: the line leaves it out; $0 is paid"
);
assert(statementDayLabel(1) === "Closes on the 1st" && statementDayLabel(22) === "Closes on the 22nd" && statementDayLabel(13) === "Closes on the 13th", "Ordinals");
assert(statementDayLabel(31) === "Closes on the 31st (or the month's last day)", "Day 31 mentions short months");

const fund = { linkedBill: { title: "Car insurance", ended: false }, dueDate: "2027-02-05", monthly: 300, remaining: 1200, ready: false, overdue: false, monthlyTransfer: null };
assert(sinkingFundLine(fund).text === "Save $300.00/month to be ready by Feb 5", `Goal line (got ${sinkingFundLine(fund).text})`);
assert(sinkingFundNote(fund) === "Safe to Spend sets this aside each month." && canSetUpTransfer(fund), "Planned in Safe to Spend; transfer offered");
const withTransfer = { ...fund, monthlyTransfer: { amount: 300 } };
assert(sinkingFundNote(withTransfer) === "Monthly transfer $300.00 is set up." && !canSetUpTransfer(withTransfer), "Transfer set up: not offered again");
assert(
  sinkingFundNote({ ...fund, monthlyTransfer: { amount: 250 } }) === "Monthly transfer $250.00 is less than the $300.00 needed.",
  "A smaller transfer is flagged"
);
assert(sinkingFundLine({ ...fund, ready: true, monthly: 0 }).text === "Ready for Car insurance on Feb 5", "Ready");
assert(sinkingFundLine({ ...fund, overdue: true, dueDate: "2026-10-01", remaining: 100 }).tone === "warn", "Overdue warns");
assert(sinkingFundLine(null) === null, "A plain goal has no sinking-fund line");

const opts = billOptions([
  { recurringGroupId: "g1", name: "Netflix", latestAmount: 18.99, cadence: "monthly", nextDate: "2026-11-02" },
  { recurringGroupId: null, name: "Legacy", latestAmount: 5, cadence: "monthly" },
]);
assert(opts.length === 1 && opts[0].label === "Netflix · $18.99 monthly" && opts[0].nextDate === "2026-11-02", "Bills to link: series with an id");

const sug = { title: "Spotify", amount: 11.99, dates: ["2026-10-22", "2026-09-22", "2026-08-23"] };
assert(suggestionText(sug) === "$11.99 about monthly, 3 times (Aug 23, Sep 22, Oct 22)", `Suggestion text (got ${suggestionText(sug)})`);
assert(
  suggestionAcceptedToast(sug, { nextDate: "2026-11-22" }) === "Spotify is now a monthly subscription. Next charge Nov 22.",
  "Accepted toast"
);

if (failed > 0) {
  console.error(`\n${failed} planningAlerts test(s) failed`);
  process.exit(1);
}
