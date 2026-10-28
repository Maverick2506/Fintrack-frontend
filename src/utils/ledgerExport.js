import { normalizeTag } from "./transactionTags.js";

const lastDayOf = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
};

/**
 * The query for GET /expenses/export.csv from the Ledger's filters, so the file holds the rows on
 * screen: type, category, month (as from/to), tag, search and sort. "all" and blanks are left out.
 */
export const ledgerExportQuery = ({ typeFilter, categoryFilter, monthFilter, tagFilter, search, sortKey, sortDir }) => {
  const params = new URLSearchParams();
  if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);
  if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
  if (monthFilter && monthFilter !== "all") {
    params.set("from", `${monthFilter}-01`);
    params.set("to", `${monthFilter}-${String(lastDayOf(monthFilter)).padStart(2, "0")}`);
  }
  if (tagFilter && tagFilter !== "all") params.set("tag", normalizeTag(tagFilter));
  const q = String(search || "").trim();
  if (q) params.set("search", q.slice(0, 200));
  if (sortKey && sortDir) params.set("sort", `${sortKey}:${sortDir}`);
  return params.toString();
};

/** The file name from the server's Content-Disposition, else fintrack-ledger-<today>.csv */
export const exportFileName = (contentDisposition, todayStr) => {
  const match = /filename="?([^";]+)"?/i.exec(String(contentDisposition || ""));
  return match ? match[1] : `fintrack-ledger-${todayStr}.csv`;
};
