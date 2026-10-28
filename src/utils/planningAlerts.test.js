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
  oneOffBillOptions,
  linkPayload,
  fundForBill,
  payFromFundLabel,
  payFromFundSplit,
  billPaidToast,
  scheduledPaymentLines,
  isCardCharge,
  cardFundBills,
  fundUseLabel,
  fundUseDetail,
  defaultFundChecks,
  fundBillsPayload,
  fundsTotal,
  cardPaidToast,
  effectiveTarget,
  goalProgress,
  coveredFundBills,
  fundNeedsMoreLabel,
  bulkPayOptions,
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
const st = { statementDate: "2026-10-15", dueDate: "2026-11-10", nextDueDate: "2026-12-10", statementBalance: 500, newCharges: 0 };
assert(statementLines(st, "2026-11-10").balanceText === "Statement balance $500.00 due Nov 10", "On the due date it is still due, not overdue");
const late = statementLines(st, "2026-11-11");
assert(
  late.overdue && late.balanceText === "Statement balance $500.00 overdue since Nov 10" && late.dueDate === "2026-11-10",
  `Unpaid after the due date is overdue (got "${late.balanceText}")`
);
const paidLate = statementLines({ ...st, statementBalance: 0 }, "2026-11-11");
assert(
  !paidLate.overdue && paidLate.balanceText === "Statement balance $0.00 due Dec 10" && paidLate.dueDate === "2026-12-10",
  `Paid after the due date points at the next due date (got "${paidLate.balanceText}")`
);
assert(statementDayLabel(1) === "Closes on the 1st" && statementDayLabel(22) === "Closes on the 22nd" && statementDayLabel(13) === "Closes on the 13th", "Ordinals");
assert(statementDayLabel(31) === "Closes on the 31st (or the month's last day)", "Day 31 mentions short months");

const fund = { linkedBill: { title: "Car insurance", ended: false }, dueDate: "2027-02-05", monthly: 300, remaining: 1200, ready: false, overdue: false, monthlyTransfer: null };
assert(
  sinkingFundLine(fund, "2026-10-28").text === "Save $300.00/month to be ready by Feb 5, 2027",
  `Goal line, with the year when it's next year (got ${sinkingFundLine(fund, "2026-10-28").text})`
);
assert(sinkingFundNote(fund) === "Safe to Spend sets this aside each month." && canSetUpTransfer(fund), "Planned in Safe to Spend; transfer offered");
const withTransfer = { ...fund, monthlyTransfer: { amount: 300 } };
assert(sinkingFundNote(withTransfer) === "Monthly transfer $300.00 is set up." && !canSetUpTransfer(withTransfer), "Transfer set up: not offered again");
assert(
  sinkingFundNote({ ...fund, monthlyTransfer: { amount: 250 } }) === "Monthly transfer $250.00 is less than the $300.00 needed.",
  "A smaller transfer is flagged"
);
assert(
  sinkingFundNote({ ...fund, monthlyTransfer: { amount: 300, until: "2027-02-01" } }) ===
    "Monthly transfers of $300.00 are scheduled until Feb 1." ,
  "Scheduled transfers show when they end"
);
const soon = { ...fund, billInForecast: true, linkedBill: { title: "Registration", nextDate: "2026-11-07" } };
assert(
  sinkingFundNote(soon) === "Safe to Spend already counts this bill on Nov 7." && canSetUpTransfer(soon),
  `A bill already in Safe to Spend's window isn't set aside again (got ${sinkingFundNote(soon)})`
);
assert(sinkingFundLine({ ...fund, ready: true, monthly: 0 }, "2027-01-04").text === "Ready for Car insurance on Feb 5", "Ready (same year: no year)");
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
assert(
  suggestionAcceptedToast({ ...sug, title: "SPOTIFY 10/22" }, { title: "Spotify", nextDate: "2026-11-22" }).startsWith("Spotify is now"),
  "The toast uses the series name the server saved"
);

console.log("--- Paying a bill from its fund; scheduled card payments ---");
const goals = [
  { id: "g1", name: "Tires Fund", current_amount: "200", linkedRecurringGroupId: "s1", sinkingFund: { done: false } },
  { id: "g2", name: "Empty Fund", current_amount: "0", linkedRecurringGroupId: "s2", sinkingFund: { done: false } },
  { id: "g3", name: "Plain", current_amount: "50", linkedRecurringGroupId: null, sinkingFund: null },
];
const tires = { id: "b1", type: "EXPENSE", recurringGroupId: "s1", isCleared: false, amount: "500" };
const tiresFund = fundForBill(goals, tires);
assert(tiresFund && tiresFund.goalId === "g1" && tiresFund.saved === 200, "A bill's fund is found by its series");
assert(payFromFundLabel(tiresFund) === "Pay from Tires Fund ($200.00 saved)", `Checkbox label (got ${payFromFundLabel(tiresFund)})`);
assert(
  !fundForBill(goals, { ...tires, recurringGroupId: "s2" }) && !fundForBill(goals, { ...tires, isCleared: true }) &&
    !fundForBill(goals, { ...tires, type: "income" }) && !fundForBill(goals, { ...tires, recurringGroupId: null }) &&
    fundForBill(goals, { ...tires, type: "expense", is_paid: false })?.goalId === "g1",
  "No offer for an empty fund, a paid bill, income or a bill with no series (Ledger rows work too)"
);
assert(
  !fundForBill([{ ...goals[0], sinkingFund: { done: true } }], tires),
  "A Done fund isn't offered"
);
assert(
  payFromFundSplit(tiresFund, 500) === "Tires Fund pays $200.00; $300.00 comes from Checking." &&
    payFromFundSplit(tiresFund, 150) === "Tires Fund pays all $150.00, so Checking doesn't change.",
  "The split says what Checking pays"
);
assert(
  billPaidToast({ sinkingFund: { paidFromFund: { amount: 200, shortfall: 300, goalName: "Tires Fund" }, rolledOver: [] } }) ===
    "Paid $200.00 from Tires Fund and $300.00 from Checking." &&
    billPaidToast(
      { sinkingFund: { paidFromFund: { amount: 600, shortfall: 0, goalName: "Insurance" }, rolledOver: [{ dueDate: "2027-11-02" }] } },
      "2026-11-02"
    ) === "Paid $600.00 from Insurance. The fund now saves for Nov 2, 2027." &&
    billPaidToast({ sinkingFund: null }) === "Bill marked as paid!",
  "Toasts after paying"
);
assert(
  sinkingFundLine({ ...tiresFund, linkedBill: { title: "Roof repair" }, done: true, paidOn: "2026-11-12" }, "2026-11-12").text ===
    "Done: Roof repair was paid Nov 12" && !canSetUpTransfer({ done: true, monthly: 0 }) && sinkingFundNote({ done: true, monthly: 5 }) === null,
  "A paid one-time bill: Done, no transfer offered"
);
assert(
  linkPayload("bill:abc").linkedBillId === "abc" && linkPayload("s1").linkedRecurringGroupId === "s1" &&
    linkPayload(null).linkedRecurringGroupId === null,
  "A one-time bill links by its id, a series by its series id"
);
const once = oneOffBillOptions([{ id: "t1", title: "Roof repair", amount: 250, date: "2026-11-12", recurringGroupId: null }]);
assert(once[0].value === "bill:t1" && once[0].label === "Roof repair · $250.00 on Nov 12", `One-time bill option (got ${once[0].label})`);

const stmt = { statementBalance: 600, scheduledPayment: { id: "p1", amount: 900, toNewCharges: 300, excess: 0, projectedBalance: 900 } };
const pl = scheduledPaymentLines(stmt);
assert(
  pl.explanation === "Scheduled $900.00 · statement $600.00 · $300.00 goes to new charges" && pl.warning === null && pl.fixes.length === 0,
  `Above the statement but within the balance: explained, no warning (got ${pl.explanation})`
);
const over = scheduledPaymentLines({ statementBalance: 600, scheduledPayment: { id: "p1", amount: 1500, toNewCharges: 300, excess: 600, projectedBalance: 900 } });
assert(
  over.warning === "This payment is $600.00 more than you owe" &&
    over.fixes.map((f) => f.pay).join() === "statement,full" && over.fixes[1].label === "Pay full balance · $900.00",
  "Above the full balance: warning with both one-tap fixes"
);
assert(
  scheduledPaymentLines({ statementBalance: 600, scheduledPayment: { id: "p1", amount: 400, toNewCharges: 0, excess: 0, projectedBalance: 900 } }).explanation === null &&
    scheduledPaymentLines({ statementBalance: 600, scheduledPayment: null }) === null,
  "A payment at or below the statement needs no explanation; nothing scheduled, no lines"
);
assert(
  scheduledPaymentLines({ statementBalance: 0, scheduledPayment: { id: "p1", amount: 100, toNewCharges: 0, excess: 100, projectedBalance: 0 } }).fixes.length === 0,
  "Nothing owed: no fix that would set the payment to $0"
);
const allOnStatement = scheduledPaymentLines({ statementBalance: 320.55, scheduledPayment: { id: "p1", date: "2026-10-31", amount: 900, toNewCharges: 0, excess: 579.45, projectedBalance: 320.55 } });
assert(
  allOnStatement.explanation === "Scheduled $900.00 on Oct 31" && allOnStatement.fixes.map((f) => f.pay).join() === "full",
  "Everything owed is on the statement: no \"$0 goes to new charges\", and one fix, not two of the same amount"
);

// Card-charged bills: the fund pays when the card is paid
const carCharge = { ...tires, fromAccount: { type: "CREDIT_CARD" } };
assert(
  isCardCharge(carCharge) && isCardCharge({ fromAccountType: "CREDIT_CARD" }) && !isCardCharge(tires) &&
    !fundForBill(goals, carCharge) && !fundForBill(goals, { ...tires, type: "expense", fromAccountType: "CREDIT_CARD" }),
  "A bill charged to a card gets no \"Pay from fund\" box (Dashboard and Ledger shapes)"
);
const fundBills = [
  { billId: "c1", title: "Car insurance", amount: 1200, goalName: "Car Fund", saved: 1000, use: 1000 },
  { billId: "c2", title: "Gym", amount: 50, goalName: "Gym Fund", saved: 0, use: 0 },
];
const cards = [{ id: "card1", fundBills }];
assert(
  cardFundBills(cards, { toAccountId: "card1", toAccount: { type: "CREDIT_CARD" }, isCleared: false }).length === 2 &&
    cardFundBills(cards, { targetAccountId: "card1", toAccountType: "CREDIT_CARD", is_paid: false }).length === 2 &&
    cardFundBills(cards, { targetAccountId: "card1", toAccountType: "CREDIT_CARD", is_paid: true }).length === 0 &&
    cardFundBills(cards, { toAccountId: "goal1", toAccount: { type: "SAVINGS_GOAL" } }).length === 0,
  "Marking an unpaid card payment paid offers that card's fund bills (Dashboard and Ledger shapes)"
);
assert(
  fundUseLabel(fundBills[0]) === "Use $1,000.00 from Car Fund" &&
    fundUseDetail(fundBills[0]) === "for Car insurance ($1,200.00); the rest comes from Checking" &&
    fundUseDetail({ ...fundBills[0], use: 1200 }) === "for Car insurance ($1,200.00)",
  `"Use $X from <fund>" box (got ${fundUseLabel(fundBills[0])} / ${fundUseDetail(fundBills[0])})`
);
const checks = defaultFundChecks(fundBills);
assert(
  checks.has("c1") && !checks.has("c2") &&
    JSON.stringify(fundBillsPayload(fundBills, checks, 1250)) === JSON.stringify([{ billId: "c1", useFund: true }, { billId: "c2", useFund: false }]) &&
    JSON.stringify(fundBillsPayload(fundBills, new Set(), 1250)) === JSON.stringify([{ billId: "c1", useFund: false }, { billId: "c2", useFund: false }]) &&
    fundsTotal(fundBills, checks, 1250) === 1000 && fundsTotal(fundBills, new Set(), 1250) === 0,
  "Funds with money are checked by default; every listed bill is sent so its fund rolls over"
);
assert(
  cardPaidToast({ cardFunds: [{ goalName: "Car Fund", amount: 1000 }] }) === "Payment saved. Car Fund paid $1,000.00 of it." &&
    cardPaidToast({ cardFunds: [{ goalName: "A", amount: 10 }, { goalName: "B", amount: 5.5 }] }) === "Payment saved. 2 savings goals paid $15.50 of it." &&
    cardPaidToast({ cardFunds: [{ goalName: "A", amount: 0 }] }) === "Card payment successful!" && cardPaidToast(null, "Paid!") === "Paid!" &&
    billPaidToast({ sinkingFund: null, cardFunds: [{ goalName: "Car Fund", amount: 1000 }] }) === "Payment saved. Car Fund paid $1,000.00 of it." &&
    billPaidToast({ sinkingFund: null, cardFunds: [] }) === "Bill marked as paid!",
  "Toast after a card payment says what the funds paid"
);

// Review fixes: a fund is used only by a payment that covers its whole bill
const covered100 = coveredFundBills(fundBills, 100);
const covered1200 = coveredFundBills(fundBills, 1200);
assert(
  !covered100.has("c1") && covered100.has("c2") && covered1200.has("c1") && !covered1200.has("c2") &&
    coveredFundBills(fundBills, 1250).size === 2 && coveredFundBills(fundBills, "").size === 0,
  "A payment covers the bills it pays in full, in order ($100: only the $50 gym; $1,200: only the insurance)"
);
assert(
  JSON.stringify(fundBillsPayload(fundBills, checks, 100)) === JSON.stringify([{ billId: "c2", useFund: false }]) &&
    fundsTotal(fundBills, checks, 100) === 0 && fundsTotal(fundBills, checks, 1200) === 1000 &&
    fundNeedsMoreLabel(fundBills[0]) === "Pay $1,200.00 or more to use Car Fund for Car insurance.",
  "A $100 payment sends no fund for the $1,200 bill (it stays for the next payment) and says what would"
);
assert(
  effectiveTarget({ goal_amount: "0", sinkingFund: { targetAmount: 1200 } }) === 1200 &&
    effectiveTarget({ goal_amount: 500, sinkingFund: { targetAmount: 1200 } }) === 500 &&
    effectiveTarget({ goal_amount: null, targetAmount: "300" }) === 300 && effectiveTarget({}) === 0 &&
    goalProgress({ goal_amount: 0, sinkingFund: { targetAmount: 1200 } }, 600) === 50 && goalProgress({}, 600) === 0,
  "A goal's target falls back to its bill; no target means 0%, not $1"
);
const paidCards = new Set();
const first = bulkPayOptions({ fundBills: [{ billId: "c1", useFund: true }] }, { targetAccountId: "card1" }, paidCards);
paidCards.add(first.cardId);
const second = bulkPayOptions({ fundBills: [{ billId: "c1", useFund: true }] }, { targetAccountId: "card1" }, paidCards);
const plain = bulkPayOptions({ payFromGoalId: "g1" }, { targetAccountId: null }, paidCards);
assert(
  first.cardId === "card1" && first.options.fundBills.length === 1 && second.cardId === null && !second.options.fundBills &&
    plain.options.payFromGoalId === "g1" && plain.cardId === null &&
    bulkPayOptions({ fundBills: [] }, { targetAccountId: "card2" }, new Set()).cardId === null,
  "Bulk: a card's fund bills go with its first payment only; a failed request (card not added) lets the next one use them"
);

// The server pays the bills in list order and skips one the rest of the payment can't cover
const bigFirst = [
  { billId: "b1", amount: 1000 },
  { billId: "b2", amount: 500 },
];
assert(
  [...coveredFundBills(bigFirst, 1200)].join() === "b1" && [...coveredFundBills(bigFirst, 500)].join() === "b2" &&
    [...coveredFundBills(bigFirst, 1500)].join() === "b1,b2" && coveredFundBills(bigFirst, 499).size === 0,
  "A large bill ahead of a smaller one: $1,200 covers the $1,000, $500 covers the $500, $1,500 both"
);
assert(
  !bulkPayOptions({ fundBills: [{ billId: "c1", useFund: true }] }, {}, new Set()).options.fundBills,
  "Bulk: a row with no card id sends no fund bills"
);

if (failed > 0) {
  console.error(`\n${failed} planningAlerts test(s) failed`);
  process.exit(1);
}
