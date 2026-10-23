import { addDaysToDateStr, getWeekStartStr } from "./dateUtils.js";

const MONTH_FORMAT = { month: "long", year: "numeric", timeZone: "UTC" };

const monthLabel = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleDateString("en-US", MONTH_FORMAT);
};

/** Which Ledger section a row's date falls in, relative to today's YYYY-MM-DD in Toronto. */
export const getLedgerGroupKey = (dateStr, todayStr) => {
  const d = String(dateStr || "").slice(0, 10);
  if (!d) return "undated";
  if (d > todayStr) return "upcoming";
  if (d === todayStr) return "today";
  if (d === addDaysToDateStr(todayStr, -1)) return "yesterday";
  if (d >= getWeekStartStr(todayStr)) return "week";
  return `month:${d.slice(0, 7)}`;
};

const FIXED_LABELS = {
  upcoming: "Upcoming",
  today: "Today",
  yesterday: "Yesterday",
  week: "This week",
  undated: "No date",
};

/**
 * Splits already-sorted Ledger rows into date sections: Upcoming, Today, Yesterday,
 * This week, then one per month. Rows keep their order inside a section. Upcoming always
 * comes first; the other sections run newest first, or oldest first when dateDir is "asc".
 */
export const groupLedgerRows = (rows, todayStr, { dateDir = "desc" } = {}) => {
  const byKey = new Map();
  for (const row of rows) {
    const key = getLedgerGroupKey(row.date, todayStr);
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(row);
  }

  const rank = (key) =>
    key === "today" ? "9999-99-99c"
    : key === "yesterday" ? "9999-99-99b"
    : key === "week" ? "9999-99-99a"
    : key === "undated" ? "0000"
    : key.slice("month:".length);

  const dated = [...byKey.keys()]
    .filter((k) => k !== "upcoming")
    .sort((a, b) => rank(b).localeCompare(rank(a)));
  if (dateDir === "asc") dated.reverse();

  const keys = byKey.has("upcoming") ? ["upcoming", ...dated] : dated;
  return keys.map((key) => ({
    key,
    label: FIXED_LABELS[key] || monthLabel(key.slice("month:".length)),
    rows: byKey.get(key),
  }));
};

/** Count and money in/out of a section. Transfers count as money out. */
export const summarizeLedgerGroup = (rows) =>
  rows.reduce(
    (acc, r) => {
      const amount = parseFloat(r.amount) || 0;
      acc.count += 1;
      if (r.type === "income") acc.moneyIn += amount;
      else acc.moneyOut += amount;
      return acc;
    },
    { count: 0, moneyIn: 0, moneyOut: 0 }
  );
