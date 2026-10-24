import toast from "react-hot-toast";
import dashboardService from "./dashboardService";
import { endSeriesConfirmMessage, endSeriesDoneToast } from "../utils/endSeries";

/**
 * Asks with the dry run's numbers, then ends the series of a Ledger-shaped row
 * ({ recurringGroupId, name, type }). Returns the result, or null when cancelled or refused.
 */
export const confirmAndEndSeries = async (row) => {
  if (!row?.recurringGroupId) return null;
  let preview;
  try {
    preview = await dashboardService.previewEndSeries(row.recurringGroupId);
  } catch (err) {
    toast.error(err?.response?.data?.error || "Couldn't load this series. Try again.");
    return null;
  }
  if (!window.confirm(endSeriesConfirmMessage(preview, row.name, row.type))) return null;
  try {
    const result = await dashboardService.endSeries(row.recurringGroupId);
    toast.success(endSeriesDoneToast(result, row.name, row.type));
    return result;
  } catch {
    // handleRequest already showed the error toast
    return null;
  }
};
