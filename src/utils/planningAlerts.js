import { formatCurrency, formatShortDate } from "./formatUtils.js";
import { getTorontoTodayStr } from "./dateUtils.js";

// Copy for batch 8: card statement cycles, sinking funds and "Make this a subscription?" suggestions.
// The server computes every number (statementService, sinkingFundService, alertService); these only
// word them.

/** Statement day input: "" clears it, otherwise a whole day 1-31. Returns { value, error }. */
export const parseStatementDay = (raw) => {
  const text = String(raw ?? "").trim();
  if (text === "") return { value: null, error: null };
  const day = Number(text);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { value: null, error: "Statement day is a day of the month, 1-31." };
  }
  return { value: day, error: null };
};

/**
 * The two lines under a card's balance, from GET /credit-cards `statement`:
 * "Statement balance $X due Nov 10" and "New charges since Oct 15 $Y". null without a statement day.
 * Once the statement's due date has passed (todayStr is Toronto today): an unpaid balance is
 * "overdue"; a paid one points at the next statement's due date instead. `dueDate` is the date to
 * show in the card header.
 */
export const statementLines = (statement, todayStr = null) => {
  if (!statement) return null;
  const paid = statement.statementBalance <= 0;
  const pastDue = Boolean(todayStr && statement.dueDate && statement.dueDate < todayStr);
  const overdue = pastDue && !paid;
  const dueDate = pastDue && paid ? statement.nextDueDate || null : statement.dueDate || null;
  const due = overdue
    ? ` overdue since ${formatShortDate(statement.dueDate)}`
    : dueDate
    ? ` due ${formatShortDate(dueDate)}`
    : "";
  return {
    balanceLabel: `Statement balance${due}`,
    balance: formatCurrency(statement.statementBalance),
    balanceText: `Statement balance ${formatCurrency(statement.statementBalance)}${due}`,
    chargesLabel: `New charges since ${formatShortDate(statement.statementDate)}`,
    charges: formatCurrency(statement.newCharges),
    chargesText: `New charges since ${formatShortDate(statement.statementDate)} ${formatCurrency(statement.newCharges)}`,
    paid,
    overdue,
    dueDate,
  };
};

/** "Closes on the 15th" for a statement day (31 also covers shorter months) */
export const statementDayLabel = (day) => {
  if (!day) return "";
  const n = Number(day);
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return n >= 29 ? `Closes on the ${n}${suffix} (or the month's last day)` : `Closes on the ${n}${suffix}`;
};

/** "Feb 5", or "Oct 29, 2027" outside this year (a fund rolled on to next year's bill) */
export const fundDateLabel = (dateStr, todayStr = getTorontoTodayStr()) =>
  dateStr && dateStr.slice(0, 4) !== todayStr.slice(0, 4)
    ? `${formatShortDate(dateStr)}, ${dateStr.slice(0, 4)}`
    : formatShortDate(dateStr);

/**
 * A sinking fund goal's line, from GET /savings-goals `sinkingFund`:
 * "Save $300.00/month to be ready by Feb 5". Returns { text, tone } or null for a goal with no bill.
 */
export const sinkingFundLine = (fund, todayStr = getTorontoTodayStr()) => {
  if (!fund) return null;
  const by = fund.dueDate ? fundDateLabel(fund.dueDate, todayStr) : null;
  const bill = fund.linkedBill;
  if (fund.done) {
    return { text: `Done: ${bill?.title || "the bill"} was paid${fund.paidOn ? ` ${formatShortDate(fund.paidOn)}` : ""}`, tone: "good" };
  }
  if (bill?.ended && !fund.dueDate) {
    return { text: `${bill.title} has ended. Pick another bill or set a date.`, tone: "muted" };
  }
  if (fund.ready) return { text: `Ready for ${bill?.title || "the bill"}${by ? ` on ${by}` : ""}`, tone: "good" };
  if (!fund.monthly) return { text: "Set a target amount and date to get a monthly amount.", tone: "muted" };
  if (fund.overdue) {
    return { text: `${formatCurrency(fund.remaining)} still needed. It was due ${by}.`, tone: "warn" };
  }
  return { text: `Save ${formatCurrency(fund.monthly)}/month to be ready by ${by}`, tone: "normal" };
};

/**
 * Under the line: what covers the monthly amount. Scheduled transfers (with an end date) or a running
 * transfer; else, when the bill's charge already falls in Safe to Spend's window, the bill itself is
 * counted there; else Safe to Spend sets the monthly amount aside.
 */
export const sinkingFundNote = (fund) => {
  if (!fund || fund.done || fund.ready || !fund.monthly) return null;
  const transfer = fund.monthlyTransfer;
  if (transfer) {
    const short = transfer.amount + 0.005 < fund.monthly;
    if (short) {
      return `Monthly transfer ${formatCurrency(transfer.amount)} is less than the ${formatCurrency(fund.monthly)} needed.`;
    }
    return transfer.until
      ? `Monthly transfers of ${formatCurrency(transfer.amount)} are scheduled until ${formatShortDate(transfer.until)}.`
      : `Monthly transfer ${formatCurrency(transfer.amount)} is set up.`;
  }
  if (fund.billInForecast) {
    const on = fund.linkedBill?.nextDate ? ` on ${formatShortDate(fund.linkedBill.nextDate)}` : "";
    return `Safe to Spend already counts this bill${on}.`;
  }
  return "Safe to Spend sets this aside each month.";
};

/** Whether to offer "Set up monthly transfer" */
export const canSetUpTransfer = (fund) =>
  Boolean(fund && !fund.done && fund.monthly > 0 && !fund.ready && !fund.monthlyTransfer);

/** Bill options for linking a goal, from GET /subscriptions: running expense series with an id */
export const billOptions = (subscriptions) =>
  (subscriptions || [])
    .filter((s) => s.recurringGroupId)
    .map((s) => ({
      value: s.recurringGroupId,
      label: `${s.name} · ${formatCurrency(s.latestAmount)} ${s.cadence}`,
      amount: s.latestAmount,
      nextDate: s.nextDate || null,
    }));

/**
 * One-time bills to save for, from GET /savings-goals/one-off-bills. A bill not linked yet has no series
 * id: its value is "bill:<id>" and linkPayload sends it as linkedBillId.
 */
export const oneOffBillOptions = (bills) =>
  (bills || []).map((b) => ({
    value: b.recurringGroupId || `bill:${b.id}`,
    label: `${b.title} · ${formatCurrency(b.amount)} on ${formatShortDate(b.date)}`,
    amount: b.amount,
    nextDate: b.date,
  }));

/** The goal fields for a linked-bill choice: a series id, a one-time bill, or none */
export const linkPayload = (value) =>
  value && value.startsWith("bill:")
    ? { linkedBillId: value.slice(5) }
    : { linkedRecurringGroupId: value || null };

/**
 * The savings goal saving for this bill, for "Pay from <fund>" when it is marked paid:
 * { goalId, name, saved } or null. Only an unpaid expense in a series a goal links to, and only when
 * the goal has money in it.
 */
export const fundForBill = (goals, bill) => {
  if (!bill || !bill.recurringGroupId || bill.is_paid || bill.isCleared) return null;
  // A bill charged to a card is paid from its fund when the card is paid (cardFundBills)
  if (isCardCharge(bill)) return null;
  const type = String(bill.type || "").toLowerCase();
  if (type && type !== "expense") return null;
  const goal = (goals || []).find(
    (g) => g.linkedRecurringGroupId === bill.recurringGroupId && g.sinkingFund && !g.sinkingFund.done
  );
  const saved = goal ? parseFloat(goal.current_amount ?? goal.initialBalance) || 0 : 0;
  return goal && saved > 0 ? { goalId: goal.id, name: goal.name, saved } : null;
};

export const payFromFundLabel = (fund) => `Pay from ${fund.name} (${formatCurrency(fund.saved)} saved)`;

/** What the fund will cover of a bill: "Tires Fund pays $200.00; $300.00 comes from Checking." */
export const payFromFundSplit = (fund, billAmount) => {
  const amount = Math.abs(parseFloat(billAmount) || 0);
  const covered = Math.min(fund.saved, amount);
  const rest = Math.round((amount - covered) * 100) / 100;
  return rest > 0
    ? `${fund.name} pays ${formatCurrency(covered)}; ${formatCurrency(rest)} comes from Checking.`
    : `${fund.name} pays all ${formatCurrency(covered)}, so Checking doesn't change.`;
};

/** Toast after marking a linked bill paid, from the PUT /expenses response's sinkingFund */
export const billPaidToast = (result, todayStr = getTorontoTodayStr()) => {
  if (result?.cardFunds?.some((f) => f.amount > 0)) return cardPaidToast(result);
  const paid = result?.sinkingFund?.paidFromFund;
  const rolled = result?.sinkingFund?.rolledOver?.[0];
  const next = rolled ? ` The fund now saves for ${fundDateLabel(rolled.dueDate, todayStr)}.` : "";
  if (!paid || !(paid.amount > 0)) return `Bill marked as paid!${next}`;
  return paid.shortfall > 0
    ? `Paid ${formatCurrency(paid.amount)} from ${paid.goalName} and ${formatCurrency(paid.shortfall)} from Checking.${next}`
    : `Paid ${formatCurrency(paid.amount)} from ${paid.goalName}.${next}`;
};

/**
 * A goal's target: its own, else its sinking fund's (the bill's amount). The Dashboard summary's
 * goal_amount is already the effective one; GET /savings-goals carries sinkingFund.targetAmount. 0 when none.
 */
export const effectiveTarget = (goal) =>
  parseFloat(goal?.goal_amount) || parseFloat(goal?.sinkingFund?.targetAmount) || parseFloat(goal?.targetAmount) || 0;

/** Percent saved of the effective target; 0 when there is no target */
export const goalProgress = (goal, current) => {
  const target = effectiveTarget(goal);
  return target > 0 ? ((parseFloat(current) || 0) / target) * 100 : 0;
};

/**
 * Which of a card's fund bills a payment of `amount` pays: each bill the payment covers in full, in
 * order, taking its amount out of the payment (as the server does). A smaller payment leaves the bill
 * for the next payment, so its fund isn't offered.
 */
export const coveredFundBills = (fundBills, amount) => {
  let left = Math.round((parseFloat(amount) || 0) * 100) / 100;
  const covered = new Set();
  for (const fb of fundBills || []) {
    if (fb.amount > left + 0.005) continue;
    left = Math.round((left - fb.amount) * 100) / 100;
    covered.add(fb.billId);
  }
  return covered;
};

// Dashboard bills carry fromAccount/toAccount objects, Ledger rows fromAccountType/toAccountType
const accountType = (bill, side) => bill?.[`${side}Account`]?.type || bill?.[`${side}AccountType`] || null;
export const isCardCharge = (bill) => accountType(bill, "from") === "CREDIT_CARD";

/**
 * Marking a payment to a card paid: the bills on that card that savings goals save for, from GET
 * /credit-cards `fundBills` ({ billId, title, amount, goalName, use, ... }). [] for anything else.
 */
export const cardFundBills = (cards, bill) => {
  if (!bill || bill.is_paid || bill.isCleared || accountType(bill, "to") !== "CREDIT_CARD") return [];
  const cardId = bill.toAccountId || bill.targetAccountId;
  return (cards || []).find((c) => c.id === cardId)?.fundBills || [];
};

/** A card fund box: "Use $1,200.00 from Car Fund", with "for Car insurance ($1,200.00)" under it */
export const fundUseLabel = (fb) => `Use ${formatCurrency(fb.use)} from ${fb.goalName}`;
export const fundUseDetail = (fb) =>
  fb.use < fb.amount
    ? `for ${fb.title} (${formatCurrency(fb.amount)}); the rest comes from Checking`
    : `for ${fb.title} (${formatCurrency(fb.amount)})`;

/** Bills whose fund has money get a box, checked by default; the rest roll over with the payment */
export const defaultFundChecks = (fundBills) => new Set((fundBills || []).filter((fb) => fb.use > 0).map((fb) => fb.billId));

/**
 * The fundBills a card payment of `amount` sends: every bill it covers (coveredFundBills), useFund for
 * the checked ones that have money. Bills it doesn't cover aren't sent, so they stay for the next payment.
 */
export const fundBillsPayload = (fundBills, checked, amount) => {
  const covered = coveredFundBills(fundBills, amount);
  return (fundBills || [])
    .filter((fb) => covered.has(fb.billId))
    .map((fb) => ({ billId: fb.billId, useFund: fb.use > 0 && checked.has(fb.billId) }));
};

/** What the checked funds move to Checking with a payment of `amount` */
export const fundsTotal = (fundBills, checked, amount) => {
  const covered = coveredFundBills(fundBills, amount);
  return (
    Math.round(
      (fundBills || []).reduce((sum, fb) => sum + (fb.use > 0 && covered.has(fb.billId) && checked.has(fb.billId) ? fb.use : 0), 0) * 100
    ) / 100
  );
};

/** Under a fund box the payment doesn't cover yet: "Pay $1,200.00 or more to use Car Fund" */
export const fundNeedsMoreLabel = (fb) => `Pay ${formatCurrency(fb.amount)} or more to use ${fb.goalName} for ${fb.title}.`;

/**
 * Bulk "Mark paid": the options for each row, as the single dialog defaults. A card's fund bills go
 * with its first payment in the batch that covers them (paidCards: card ids already used, updated by
 * the caller once that request succeeds). Returns { options, cardId }.
 */
export const bulkPayOptions = (defaultOptions, row, paidCards) => {
  const cardId = row.toAccountId || row.targetAccountId || null;
  const options = { ...defaultOptions };
  if (options.fundBills && (paidCards.has(cardId) || options.fundBills.length === 0)) delete options.fundBills;
  return { options, cardId: options.fundBills ? cardId : null };
};

/** Toast after a card payment, from the response's cardFunds */
export const cardPaidToast = (result, fallback = "Card payment successful!") => {
  const paid = (result?.cardFunds || []).filter((f) => f.amount > 0);
  if (paid.length === 0) return fallback;
  const total = paid.reduce((sum, f) => sum + f.amount, 0);
  return paid.length === 1
    ? `Payment saved. ${paid[0].goalName} paid ${formatCurrency(total)} of it.`
    : `Payment saved. ${paid.length} savings goals paid ${formatCurrency(total)} of it.`;
};

/**
 * A card's next scheduled payment against its statement, from GET /credit-cards
 * `statement.scheduledPayment`:
 * - explanation, when it is above the statement balance: "Scheduled $A · statement $S · $X goes to new charges"
 * - warning, when it is above the full balance owed by then: "This payment is $X more than you owe",
 *   with the one-tap fixes it can offer (statement balance, full balance).
 * null when nothing is scheduled.
 */
export const scheduledPaymentLines = (statement) => {
  const sp = statement?.scheduledPayment;
  if (!sp) return null;
  // Above the statement and paying some new charges (above the full balance, the warning says the rest)
  const above = sp.amount > statement.statementBalance + 0.005 && sp.toNewCharges > 0;
  return {
    paymentId: sp.id,
    explanation: above
      ? `Scheduled ${formatCurrency(sp.amount)} · statement ${formatCurrency(statement.statementBalance)} · ${formatCurrency(sp.toNewCharges)} goes to new charges`
      : sp.excess > 0
      ? `Scheduled ${formatCurrency(sp.amount)} on ${formatShortDate(sp.date)}`
      : null,
    warning: sp.excess > 0 ? `This payment is ${formatCurrency(sp.excess)} more than you owe` : null,
    fixes:
      sp.excess > 0
        ? [
            // The statement balance, when it differs from the full balance (else one button says it)
            ...(statement.statementBalance > 0 && statement.statementBalance < sp.projectedBalance - 0.005
              ? [{ pay: "statement", label: `Pay statement balance · ${formatCurrency(statement.statementBalance)}` }]
              : []),
            ...(sp.projectedBalance > 0
              ? [{ pay: "full", label: `Pay full balance · ${formatCurrency(sp.projectedBalance)}` }]
              : []),
          ]
        : [],
  };
};

/** "Spotify · $11.99 about monthly, 3 times (Aug 23, Sep 22, Oct 22)" */
export const suggestionText = (s) => {
  if (!s) return "";
  const dates = (s.dates || []).slice().reverse().map(formatShortDate).join(", ");
  return `${formatCurrency(s.amount)} about monthly, ${(s.dates || []).length} times (${dates})`;
};

export const suggestionAcceptedToast = (s, result) =>
  `${result?.title || s.title} is now a monthly subscription${result?.nextDate ? `. Next charge ${formatShortDate(result.nextDate)}` : ""}.`;
