import { formatCurrency } from "./formatUtils.js";

/** "+$80.00", "-$110.00" or "$0.00" */
export const signedCurrency = (amount) => {
  const n = Number(amount) || 0;
  return `${n > 0 ? "+" : ""}${formatCurrency(n)}`;
};

/** How much of a budget is used, 0-100 for the bar (over budget fills it) */
export const budgetUsePercent = (spent, budget) => {
  if (!(budget > 0)) return spent > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, (spent / budget) * 100));
};

/**
 * What to show for the commentary after its request failed: a quiet note for the daily AI limit,
 * nothing when AI is off (503) or the note couldn't be written.
 */
export const commentaryErrorNote = (error) => {
  const status = error?.response?.status;
  if (status === 429) return error.response.data?.error || "Today's AI limit is reached. The note comes back tomorrow.";
  return null;
};

/** The month (YYYY-MM) the Reports page is on, or null when it's after this Toronto month */
export const monthCloseMonth = (year, month, todayStr) => {
  const ym = `${year}-${String(month).padStart(2, "0")}`;
  return ym > String(todayStr).slice(0, 7) ? null : ym;
};
