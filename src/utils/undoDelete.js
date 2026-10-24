import { formatCurrency } from "./formatUtils.js";

// Undo after a delete: deleted transactions go to the Trash, and the toast offers Undo for 10 s
export const UNDO_TOAST_MS = 10000;

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "Deleted 3 transactions" */
export const deletedMessage = (count) => `Deleted ${plural(count, "transaction")}`;

/** "Restored 3 transactions" */
export const restoredMessage = (count) => `Restored ${plural(count, "transaction")}`;

/** Ids a delete actually removed: the bulk-delete response lists them, a single DELETE has none */
export const deletedIdsFrom = (requestedIds, response) =>
  Array.isArray(response?.ids) ? response.ids : requestedIds;

/**
 * Confirm text for setting a recurring row to One-time, from PUT /expenses/:id?dryRun=1.
 * Returns null when the change only affects this row (no confirm needed).
 */
export const seriesEndConfirmMessage = (preview, type = "expense") => {
  if (!preview || !preview.seriesEnded) return null;
  const count = parseInt(preview.removedUpcomingCount, 10) || 0;
  const noun = type === "income" ? "payment" : "charge";
  if (count === 0) return "Ends the series. There are no upcoming " + noun + "s to remove.";
  return `Ends the series and removes ${plural(count, `upcoming ${noun}`)} (${formatCurrency(
    preview.removedUpcomingTotal
  )}).`;
};

// Used when the preview could not be loaded: ask anyway, since the change may end the series
export const SERIES_END_FALLBACK_MESSAGE =
  "End this recurring series? If this is its current charge, the series stops here and its upcoming unpaid charges are removed.";

/** True when a save sets a recurring row to One-time, which may end its series */
export const mayEndSeries = (existingTransaction, nextRecurrence) =>
  Boolean(
    existingTransaction?.id &&
      existingTransaction.recurrence &&
      existingTransaction.recurrence !== "none" &&
      nextRecurrence === "none"
  );

/** "Removed for good on Nov 23" style date for a Trash row, in Toronto time */
export const purgeLabel = (purgeAfter) => {
  if (!purgeAfter) return "";
  const date = new Date(purgeAfter);
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-CA", {
    timeZone: "America/Toronto",
    month: "short",
    day: "numeric",
  });
};
