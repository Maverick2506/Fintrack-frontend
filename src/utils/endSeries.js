import { formatCurrency } from "./formatUtils.js";

// "End series" (POST /recurring/:recurringGroupId/end) stops any recurring series: expenses,
// income and transfers. Its dry run says how many upcoming unpaid rows it would remove.

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** What one occurrence is called: a charge for expenses, a payment for income and transfers */
export const seriesNoun = (type = "expense") =>
  String(type).toLowerCase() === "expense" ? "charge" : "payment";

/** True for a row that belongs to a series, so it can be ended */
export const canEndSeries = (row) => Boolean(row?.recurringGroupId);

/**
 * Confirm text from the dry run: "End 'Gym'? Removes 3 upcoming charges ($48.00). Past and paid entries stay."
 * note is added at the end (e.g. that unsaved form changes are dropped).
 */
export const endSeriesConfirmMessage = (preview, title, type = "expense", note = "") => {
  const noun = seriesNoun(type);
  const count = parseInt(preview?.removedUpcomingCount, 10) || 0;
  const removes =
    count === 0
      ? `There are no upcoming ${noun}s to remove.`
      : `Removes ${plural(count, `upcoming ${noun}`)} (${formatCurrency(preview?.removedUpcomingTotal || 0)}).`;
  return `End '${title}'? ${removes} Past and paid entries stay.${note ? ` ${note}` : ""}`;
};

/** Toast after ending: "Ended 'Gym'. Removed 3 upcoming charges ($48.00)." */
export const endSeriesDoneToast = (result, title, type = "expense") => {
  const count = parseInt(result?.removedUpcomingCount, 10) || 0;
  if (count === 0) return `Ended '${title}'.`;
  return `Ended '${title}'. Removed ${plural(count, `upcoming ${seriesNoun(type)}`)} (${formatCurrency(
    result?.removedUpcomingTotal || 0
  )}).`;
};

/** Shown when the dry run says no row of the series still recurs */
export const alreadyEndedMessage = (title) => `'${title}' has already ended.`;

const CADENCE_LABELS = {
  weekly: "every week",
  "bi-weekly": "every 2 weeks",
  monthly: "every month",
  yearly: "every year",
};

/** "every 2 weeks" for a recurrence, or "" when it does not repeat */
export const cadenceLabel = (recurrence) => CADENCE_LABELS[recurrence] || "";

/** Goal card line for a running contribution series: "Recurring: $50.00 every week" */
export const recurringContributionLine = (contribution) =>
  contribution && cadenceLabel(contribution.recurrence)
    ? `Recurring: ${formatCurrency(contribution.amount || 0)} ${cadenceLabel(contribution.recurrence)}`
    : null;
