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

/**
 * Toasts for a POST /expenses/restore answer: { restoredCount, moved: [{ archivedAccount }], refused: [{ message }] }.
 * Returns { success: string[], error: string | null }.
 */
export const restoreResultMessages = (data, requestedCount = 0) => {
  const moved = Array.isArray(data?.moved) ? data.moved : [];
  const refused = Array.isArray(data?.refused) ? data.refused : [];
  const restoredCount = data?.restoredCount ?? requestedCount;
  const success = [];
  const plain = restoredCount - moved.length;
  if (plain > 0) success.push(restoredMessage(plain));
  const byAccount = new Map();
  for (const m of moved) byAccount.set(m.archivedAccount, (byAccount.get(m.archivedAccount) || 0) + 1);
  for (const [account, count] of byAccount) {
    success.push(
      `Restored ${count === 1 ? "" : `${count} `}to Checking — ${account} is archived`
    );
  }
  let error = null;
  if (refused.length === 1) error = refused[0].message;
  else if (refused.length > 1) {
    const accounts = [...new Set(refused.map((r) => r.archivedAccount))].join(", ");
    error = `${refused.length} paid transactions stay in the Trash: restoring them would change the balance of ${accounts}, which ${refused.length > 1 && accounts.includes(",") ? "are" : "is"} archived.`;
  }
  if (success.length === 0 && !error && restoredCount === 0) success.push("Already restored");
  return { success, error };
};

/** Trash hint for a row on an archived account, from GET /expenses/trash restoreAction */
export const trashArchivedHint = (row) => {
  if (!row?.archivedAccount) return null;
  if (row.restoreAction === "moveToChecking") return "Restores to Checking";
  if (row.restoreAction === "refuse") return `Can't restore: it would change ${row.archivedAccount}'s balance`;
  return null;
};
