import { formatShortDate } from "./formatUtils.js";

/**
 * The Ledger a page at a time (R5). GET /expenses/all answers { rows, hasMore, from, to, reviewCount }:
 * without from= it is the last 3 months plus every upcoming row. "Load older" asks again with a from=
 * 3 months earlier, so the list (and its sort) always comes from one answer. A search goes to the
 * server and covers all history.
 */
export const LEDGER_PAGE_MONTHS = 3;

/** YYYY-MM-DD moved by whole months, keeping the day or using the month's last day (May 31 - 3 = Feb 28) */
export const addMonthsToDateStr = (dateStr, months) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
};

/** The from= for "Load older": 3 months before the oldest day loaded */
export const olderWindowFrom = (from) => addMonthsToDateStr(from, -LEDGER_PAGE_MONTHS);

/** Query params for a Ledger read: a search (all history), else the loaded window (or the server's default) */
export const ledgerFetchParams = ({ windowFrom, search }) => {
  const q = String(search || "").trim();
  if (q) return { search: q.slice(0, 200) };
  return windowFrom ? { from: windowFrom } : {};
};

/** The line under the list: what's loaded */
export const ledgerWindowNote = ({ from, hasMore, searching }) => {
  if (searching) return "Searching all history";
  if (!from || !hasMore) return "All history loaded";
  return `Showing since ${formatShortDate(from)}, ${from.slice(0, 4)}`;
};
