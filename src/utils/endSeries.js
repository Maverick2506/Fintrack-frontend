import { formatCurrency } from "./formatUtils.js";

// "End series" (POST /recurring/:recurringGroupId/end) stops any recurring series: expenses,
// income and transfers. Its dry run says how many upcoming unpaid rows it would remove.

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** What one occurrence is called: a charge for expenses, a payment for income and transfers */
export const seriesNoun = (type = "expense") =>
  String(type).toLowerCase() === "expense" ? "charge" : "payment";

/** True for a row that belongs to a series, so it can be ended */
export const canEndSeries = (row) => Boolean(row?.recurringGroupId);

/** Confirm text from the dry run: "End 'Gym'? Removes 3 upcoming charges ($48.00). Past and paid entries stay." */
export const endSeriesConfirmMessage = (preview, title, type = "expense") => {
  const noun = seriesNoun(type);
  const count = parseInt(preview?.removedUpcomingCount, 10) || 0;
  const removes =
    count === 0
      ? `There are no upcoming ${noun}s to remove.`
      : `Removes ${plural(count, `upcoming ${noun}`)} (${formatCurrency(preview?.removedUpcomingTotal || 0)}).`;
  return `End '${title}'? ${removes} Past and paid entries stay.`;
};

/** Toast after ending: "Ended 'Gym'. Removed 3 upcoming charges ($48.00)." */
export const endSeriesDoneToast = (result, title, type = "expense") => {
  const count = parseInt(result?.removedUpcomingCount, 10) || 0;
  if (count === 0) return `Ended '${title}'.`;
  return `Ended '${title}'. Removed ${plural(count, `upcoming ${seriesNoun(type)}`)} (${formatCurrency(
    result?.removedUpcomingTotal || 0
  )}).`;
};
