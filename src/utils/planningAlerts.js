import { formatCurrency, formatShortDate } from "./formatUtils.js";

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
 */
export const statementLines = (statement) => {
  if (!statement) return null;
  const due = statement.dueDate ? ` due ${formatShortDate(statement.dueDate)}` : "";
  return {
    balanceLabel: `Statement balance${due}`,
    balance: formatCurrency(statement.statementBalance),
    balanceText: `Statement balance ${formatCurrency(statement.statementBalance)}${due}`,
    chargesLabel: `New charges since ${formatShortDate(statement.statementDate)}`,
    charges: formatCurrency(statement.newCharges),
    chargesText: `New charges since ${formatShortDate(statement.statementDate)} ${formatCurrency(statement.newCharges)}`,
    paid: statement.statementBalance <= 0,
  };
};

/** "Closes on the 15th" for a statement day (31 also covers shorter months) */
export const statementDayLabel = (day) => {
  if (!day) return "";
  const n = Number(day);
  const suffix = n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th";
  return n >= 29 ? `Closes on the ${n}${suffix} (or the month's last day)` : `Closes on the ${n}${suffix}`;
};

/**
 * A sinking fund goal's line, from GET /savings-goals `sinkingFund`:
 * "Save $300.00/month to be ready by Feb 5". Returns { text, tone } or null for a goal with no bill.
 */
export const sinkingFundLine = (fund) => {
  if (!fund) return null;
  const by = fund.dueDate ? formatShortDate(fund.dueDate) : null;
  const bill = fund.linkedBill;
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

/** Under the line: whether Safe to Spend sets it aside or a transfer covers it */
export const sinkingFundNote = (fund) => {
  if (!fund || fund.ready || !fund.monthly) return null;
  const transfer = fund.monthlyTransfer;
  if (transfer) {
    const short = transfer.amount + 0.005 < fund.monthly;
    return short
      ? `Monthly transfer ${formatCurrency(transfer.amount)} is less than the ${formatCurrency(fund.monthly)} needed.`
      : `Monthly transfer ${formatCurrency(transfer.amount)} is set up.`;
  }
  return "Safe to Spend sets this aside each month.";
};

/** Whether to offer "Set up monthly transfer" */
export const canSetUpTransfer = (fund) =>
  Boolean(fund && fund.monthly > 0 && !fund.ready && !fund.monthlyTransfer);

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

/** "Spotify · $11.99 about monthly, 3 times (Aug 23, Sep 22, Oct 22)" */
export const suggestionText = (s) => {
  if (!s) return "";
  const dates = (s.dates || []).slice().reverse().map(formatShortDate).join(", ");
  return `${formatCurrency(s.amount)} about monthly, ${(s.dates || []).length} times (${dates})`;
};

export const suggestionAcceptedToast = (s, result) =>
  `${s.title} is now a monthly subscription${result?.nextDate ? `. Next charge ${formatShortDate(result.nextDate)}` : ""}.`;
