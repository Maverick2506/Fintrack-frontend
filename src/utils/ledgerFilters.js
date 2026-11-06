import { formatMonthYear } from "./formatUtils.js";

export const TYPE_OPTIONS = [
  ["all", "All"],
  ["income", "Income"],
  ["expense", "Expense"],
  ["transfer", "Transfer"],
];

// Sort key and direction together, so one list serves the sheet, the desktop select and the chip
export const SORT_OPTIONS = [
  { key: "date", dir: "desc", label: "Newest first" },
  { key: "date", dir: "asc", label: "Oldest first" },
  { key: "amount", dir: "desc", label: "Largest amount" },
  { key: "amount", dir: "asc", label: "Smallest amount" },
  { key: "name", dir: "asc", label: "Name A to Z" },
  { key: "name", dir: "desc", label: "Name Z to A" },
];

export const DEFAULT_SORT = { key: "date", dir: "desc" };

/** "2026-10" as "Oct 2026" */
export const monthOptionLabel = (ym) => formatMonthYear(`${ym}-01`);

/**
 * Removable chips for the filters in use, in the order they show under the search row.
 * The sort only gets a chip when it is not the default (newest first).
 */
export const getActiveFilterChips = ({ typeFilter, categoryFilter, monthFilter, tagFilter, sortKey, sortDir }) => {
  const chips = [];
  if (typeFilter && typeFilter !== "all") {
    const type = TYPE_OPTIONS.find(([value]) => value === typeFilter);
    chips.push({ id: "type", label: type ? type[1] : typeFilter });
  }
  if (categoryFilter && categoryFilter !== "all") chips.push({ id: "category", label: categoryFilter });
  if (monthFilter && monthFilter !== "all") chips.push({ id: "month", label: monthOptionLabel(monthFilter) });
  if (tagFilter && tagFilter !== "all") chips.push({ id: "tag", label: `#${tagFilter}` });
  if (sortKey && (sortKey !== DEFAULT_SORT.key || sortDir !== DEFAULT_SORT.dir)) {
    const sort = SORT_OPTIONS.find((o) => o.key === sortKey && o.dir === sortDir);
    chips.push({ id: "sort", label: sort ? sort.label : `Sort: ${sortKey}` });
  }
  return chips;
};
