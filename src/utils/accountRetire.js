import { formatCurrency } from "./formatUtils.js";

const ACCOUNT_NOUNS = {
  CREDIT_CARD: "card",
  DEBT: "debt",
  SAVINGS_GOAL: "goal",
};

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

const joinList = (parts) => {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

/**
 * Turns GET /accounts/:id/delete-impact into the lines the delete dialog shows, e.g.
 * "Netflix (monthly) and 1 upcoming payment use this card".
 */
export const describeDeleteImpact = (impact) => {
  const noun = ACCOUNT_NOUNS[impact?.type] || "account";
  const series = impact?.series || [];
  const items = impact?.unpaid?.items || [];
  const seriesIds = new Set(series.map((s) => s.recurringGroupId));

  // Unpaid rows that belong to a listed series are covered by the series name
  const loose = items.filter((i) => !i.recurringGroupId || !seriesIds.has(i.recurringGroupId));
  const loosePayments = loose.filter((i) => i.type === "TRANSFER").length;
  const looseCharges = loose.length - loosePayments;

  const parts = series.map((s) => `${s.title} (${s.recurrence})`);
  if (looseCharges > 0) parts.push(plural(looseCharges, "upcoming charge"));
  if (loosePayments > 0) parts.push(plural(loosePayments, "upcoming payment"));

  const thingCount = series.length + loose.length;
  const usedBy = parts.length
    ? `${joinList(parts)} ${thingCount === 1 ? "uses" : "use"} this ${noun}`
    : null;

  const movableSeries = series.filter((s) => s.movable).length;
  const movableItems = items.filter((i) => i.movable).length;
  const canMove = movableSeries + movableItems > 0;
  // Payments or contributions going to the account cannot move: there is nothing left to pay
  const endsAnyway = series.some((s) => !s.movable) || items.some((i) => !i.movable);

  const balance = parseFloat(impact?.balance) || 0;
  const goalBalanceLine =
    impact?.type === "SAVINGS_GOAL" && balance > 0
      ? `Move ${formatCurrency(balance)} back to Checking?`
      : null;

  // Archived or deleted cards and debts leave net worth, so say what is still owed
  const owedLine =
    (impact?.type === "CREDIT_CARD" || impact?.type === "DEBT") && balance > 0
      ? `${formatCurrency(balance)} is still owed on this ${noun}. It will no longer count in your net worth.`
      : null;

  return {
    noun,
    owedLine,
    usedBy,
    hasCommitments: parts.length > 0,
    canMove,
    endsAnyway: canMove && endsAnyway,
    goalBalance: impact?.type === "SAVINGS_GOAL" ? Math.max(0, balance) : 0,
    goalBalanceLine,
  };
};

/** Body for DELETE /credit-cards|debts|savings-goals/:id */
export const buildRetirePayload = ({ mode, seriesChoice, moveBalance }) => ({
  mode: mode === "delete" ? "delete" : "archive",
  series: seriesChoice === "moveToChecking" ? "moveToChecking" : "end",
  moveBalanceToChecking: Boolean(moveBalance),
});

const NON_CHECKING = ["CREDIT_CARD", "DEBT", "SAVINGS_GOAL"];

/**
 * The card, debt or goal a Ledger row belongs to, e.g. "Visa (archived)". Null for Checking-only rows.
 */
export const getLedgerAccountLabel = (row) => {
  const side = NON_CHECKING.includes(row?.toAccountType)
    ? { name: row.toAccount, archived: row.toAccountArchived }
    : NON_CHECKING.includes(row?.fromAccountType)
    ? { name: row.fromAccount, archived: row.fromAccountArchived }
    : null;
  if (!side || !side.name) return null;
  return side.archived ? `${side.name} (archived)` : side.name;
};
