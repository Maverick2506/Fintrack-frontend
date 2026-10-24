import { formatCurrency, formatShortDate } from "./formatUtils.js";

const ACCOUNT_NOUNS = {
  CREDIT_CARD: "card",
  DEBT: "debt",
  SAVINGS_GOAL: "goal",
};

// Reasons the backend accepts for POST /accounts/:id/adjust-to-zero
export const ADJUST_REASONS = [
  { value: "written_off", label: "Written off" },
  { value: "closed_by_bank", label: "Closed by bank" },
  { value: "spent", label: "Spent" },
];

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const joinList = (parts) => {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

const byDate = (a, b) => String(a.date).localeCompare(String(b.date));

/**
 * Turns GET /accounts/:id/delete-impact into what the archive dialog shows, e.g.
 * "Netflix (monthly) and 1 upcoming payment use this card", "2 overdue, 3 upcoming",
 * and whether the balance still has to be brought to $0.
 */
export const describeDeleteImpact = (impact) => {
  const noun = ACCOUNT_NOUNS[impact?.type] || "account";
  const series = impact?.series || [];
  const items = impact?.unpaid?.items || [];
  const seriesIds = new Set(series.map((s) => s.recurringGroupId));

  // Unpaid rows that belong to a listed series are covered by the series name
  const loose = items.filter((i) => !i.recurringGroupId || !seriesIds.has(i.recurringGroupId));
  const countLoose = (overdue, isPayment) =>
    loose.filter((i) => Boolean(i.overdue) === overdue && (i.type === "TRANSFER") === isPayment).length;

  const parts = series.map((s) => `${s.title} (${s.recurrence})`);
  for (const [overdue, isPayment, word] of [
    [true, false, "overdue charge"],
    [true, true, "overdue payment"],
    [false, false, "upcoming charge"],
    [false, true, "upcoming payment"],
  ]) {
    const n = countLoose(overdue, isPayment);
    if (n > 0) parts.push(plural(n, word));
  }

  const thingCount = series.length + loose.length;
  const usedBy = parts.length
    ? `${joinList(parts)} ${thingCount === 1 ? "uses" : "use"} this ${noun}`
    : null;

  const overdueItems = items.filter((i) => i.overdue).sort(byDate);
  const upcomingItems = items.filter((i) => !i.overdue).sort(byDate);
  const countParts = [];
  if (overdueItems.length) countParts.push(`${overdueItems.length} overdue`);
  if (upcomingItems.length) countParts.push(`${upcomingItems.length} upcoming`);

  const movableSeries = series.filter((s) => s.movable).length;
  const movableItems = items.filter((i) => i.movable).length;
  const canMove = movableSeries + movableItems > 0;
  // Payments or contributions going to the account cannot move: there is nothing left to pay
  const endsAnyway = series.some((s) => !s.movable) || items.some((i) => !i.movable);

  const balance = Math.round((parseFloat(impact?.balance) || 0) * 100) / 100;
  const isGoal = impact?.type === "SAVINGS_GOAL";
  let balanceLine = null;
  if (balance > 0) {
    balanceLine = isGoal
      ? `${formatCurrency(balance)} is still in this goal.`
      : `${formatCurrency(balance)} is still owed on this ${noun}.`;
  } else if (balance < 0) {
    balanceLine = isGoal
      ? `This goal is ${formatCurrency(-balance)} below $0.`
      : `This ${noun} has a ${formatCurrency(-balance)} credit.`;
  }
  const finalPaymentLabel =
    balance > 0
      ? isGoal
        ? `Move ${formatCurrency(balance)} back to Checking`
        : `Record final payment of ${formatCurrency(balance)}`
      : null;

  return {
    noun,
    usedBy,
    hasCommitments: parts.length > 0,
    canMove,
    endsAnyway: canMove && endsAnyway,
    overdueItems,
    upcomingItems,
    unpaidCountsLine: countParts.length ? countParts.join(", ") : null,
    balance,
    canRetire: impact ? (impact.canRetire ?? balance === 0) : false,
    balanceLine,
    finalPaymentLabel,
  };
};

/** One line for an unpaid row in the dialog, e.g. "Oct 20 · $80.00" */
export const describeUnpaidItem = (item) =>
  `${formatShortDate(item.date)} · ${formatCurrency(item.amount)}`;

/** Body for DELETE /credit-cards|debts|savings-goals/:id */
export const buildRetirePayload = ({ mode, seriesChoice }) => ({
  mode: mode === "delete" ? "delete" : "archive",
  series: seriesChoice === "moveToChecking" ? "moveToChecking" : "end",
});

const NON_CHECKING = ["CREDIT_CARD", "DEBT", "SAVINGS_GOAL"];

/** The card, debt or goal side of a Ledger row as { name, type, archived }. Null for Checking-only rows. */
export const getLedgerAccountSide = (row) => {
  const side = NON_CHECKING.includes(row?.toAccountType)
    ? { name: row.toAccount, type: row.toAccountType, archived: Boolean(row.toAccountArchived) }
    : NON_CHECKING.includes(row?.fromAccountType)
    ? { name: row.fromAccount, type: row.fromAccountType, archived: Boolean(row.fromAccountArchived) }
    : null;
  return side && side.name ? side : null;
};

/**
 * The card, debt or goal a Ledger row belongs to, e.g. "Visa (archived)". Null for Checking-only rows.
 */
export const getLedgerAccountLabel = (row) => {
  const side = getLedgerAccountSide(row);
  if (!side) return null;
  return side.archived ? `${side.name} (archived)` : side.name;
};

/**
 * Transfers (card, debt and goal payments), goal contributions and card purchases show their
 * card, debt or goal as a chip instead of the category. Null for Checking-only rows, which keep
 * the category.
 */
export const getLedgerAccountChip = (row) => {
  const side = getLedgerAccountSide(row);
  if (!side) return null;
  return { ...side, label: side.archived ? `${side.name} (archived)` : side.name };
};

const ledgerSide = (name, type, archived) => {
  if (!name) return null;
  // There is one checking account, created as "Primary Checking"; the Ledger calls it Checking
  const shown = type === "CHECKING" && name === "Primary Checking" ? "Checking" : name;
  return { name: archived ? `${shown} (archived)` : shown, type };
};

/**
 * The account part of a Ledger row's "Category · Account" line, as { from, to } where each side
 * is { name, type } or null. Transfers and goal contributions show both sides ("Checking → Amex"),
 * income shows where it landed, and purchases show the card or Checking they were paid from.
 */
export const getLedgerAccountLine = (row) => {
  const from = ledgerSide(row?.fromAccount, row?.fromAccountType, row?.fromAccountArchived);
  const to = ledgerSide(row?.toAccount, row?.toAccountType, row?.toAccountArchived);
  if (row?.type === "income") return { from: to || from, to: null };
  if (from && to) return { from, to };
  return { from: from || to, to: null };
};
