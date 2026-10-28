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
  const paid = result?.sinkingFund?.paidFromFund;
  const rolled = result?.sinkingFund?.rolledOver?.[0];
  const next = rolled ? ` The fund now saves for ${fundDateLabel(rolled.dueDate, todayStr)}.` : "";
  if (!paid || !(paid.amount > 0)) return `Bill marked as paid!${next}`;
  return paid.shortfall > 0
    ? `Paid ${formatCurrency(paid.amount)} from ${paid.goalName} and ${formatCurrency(paid.shortfall)} from Checking.${next}`
    : `Paid ${formatCurrency(paid.amount)} from ${paid.goalName}.${next}`;
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
