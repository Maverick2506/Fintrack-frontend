import { formatCurrency } from "./formatUtils.js";

// "Sync with statement" (F4): the sheet asks what the statement says and previews the one row
// the server will record for the difference (POST /accounts/:id/reconcile).

const round2 = (n) => Math.round(n * 100) / 100;

export const SYNC_REASONS = [
  { value: "adjustment", label: "Adjustment" },
  { value: "interest", label: "Interest" },
];

// Turns what the user typed ("$1,234.50", "-20") into a number, or null when it isn't one
export const parseStatementAmount = (raw) => {
  const cleaned = String(raw ?? "").replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? round2(n) : null;
};

const NOUNS = { CHECKING: "Checking", CREDIT_CARD: "card", DEBT: "debt" };

/**
 * What saving would do, for the preview line.
 * Returns { difference, canSave, line, tone, allowInterest } where tone is "up" | "down" | "same" | "empty".
 * For a card or debt, "up" means you owe more; for Checking, it means more money.
 * allowInterest: only a card or debt that owes more can record the difference as interest
 * (the server refuses anything else); a lower statement or Checking is always an adjustment.
 */
export const describeStatementDifference = ({ type, appBalance, actualRaw }) => {
  const actual = parseStatementAmount(actualRaw);
  const app = round2(Number(appBalance) || 0);
  if (actual === null) {
    return { difference: null, canSave: false, line: "", tone: "empty", allowInterest: false };
  }
  const difference = round2(actual - app);
  if (difference === 0) {
    return {
      difference,
      canSave: false,
      line: "That matches the app. Nothing to record.",
      tone: "same",
      allowInterest: false,
    };
  }
  const amount = formatCurrency(Math.abs(difference));
  const isOwed = type === "CREDIT_CARD" || type === "DEBT";
  const noun = NOUNS[type] || "account";
  let line;
  if (isOwed) {
    line =
      difference > 0
        ? `You owe ${amount} more than the app shows. Saving adds one ${amount} charge to this ${noun}.`
        : `You owe ${amount} less than the app shows. Saving records one ${amount} credit to this ${noun}.`;
  } else {
    line =
      difference > 0
        ? `Your bank shows ${amount} more. Saving adds ${amount} to Checking.`
        : `Your bank shows ${amount} less. Saving takes ${amount} out of Checking.`;
  }
  return {
    difference,
    canSave: true,
    line,
    tone: difference > 0 ? "up" : "down",
    allowInterest: isOwed && difference > 0,
  };
};

// Interest is sent only when the preview allows it, whatever was picked before the amount changed
export const buildReconcilePayload = ({ actualRaw, reason, allowInterest }) => ({
  actualBalance: parseStatementAmount(actualRaw),
  reason: allowInterest && reason === "interest" ? "interest" : "adjustment",
});
