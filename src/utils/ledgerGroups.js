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
 * This week, then one per month. Rows keep their order inside a section, except that with
 * sortByDate Upcoming runs soonest first, so the next thing due is on top. Upcoming always
 * comes first; the other sections run newest first, or oldest first when dateDir is "asc".
 */
export const groupLedgerRows = (rows, todayStr, { dateDir = "desc", sortByDate = false } = {}) => {
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

  if (sortByDate && byKey.has("upcoming")) {
    const dateOf = (r) => String(r.date).slice(0, 10);
    byKey.get("upcoming").sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  }

  const keys = byKey.has("upcoming") ? ["upcoming", ...dated] : dated;
  return keys.map((key) => ({
    key,
    label: FIXED_LABELS[key] || monthLabel(key.slice("month:".length)),
    rows: byKey.get(key),
    // Date sorts: one block per day (Upcoming soonest first, past days follow the date
    // direction). Name or Amount sorts: one undated block, so the sort runs across the section.
    days: sortByDate
      ? groupRowsByDay(byKey.get(key), key === "upcoming" ? "asc" : dateDir)
      : [{ date: null, rows: byKey.get(key), net: getDayNet(byKey.get(key)) }],
  }));
};

/**
 * Splits a section's rows into days, each with its net total. Rows keep their order inside a
 * day (so a Name or Amount sort still applies there); days run by date in the given direction.
 * Rows without a date share one day keyed "".
 */
export const groupRowsByDay = (rows, dir = "desc") => {
  const byDay = new Map();
  for (const row of rows) {
    const day = String(row.date || "").slice(0, 10);
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day).push(row);
  }
  const days = [...byDay.keys()].sort((a, b) => (dir === "asc" ? a.localeCompare(b) : b.localeCompare(a)));
  return days.map((date) => ({ date, rows: byDay.get(date), net: getDayNet(byDay.get(date)) }));
};

/**
 * A day's net: income minus expenses. Transfers (card, debt and goal payments) move money
 * between your own accounts, and card purchases already count as expenses, so they add nothing.
 */
export const getDayNet = (rows) => {
  const cents = rows.reduce((sum, r) => {
    const amount = Math.round((parseFloat(r.amount) || 0) * 100);
    if (r.type === "income") return sum + amount;
    if (r.type === "expense") return sum - amount;
    return sum;
  }, 0);
  return cents / 100;
};

const DAY_FORMAT = { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" };

/** Day header text: "Today · Sat, Oct 24", "Yesterday · Fri, Oct 23", "Thu, Oct 22", "Wed, Dec 31, 2025". */
export const formatDayLabel = (dateStr, todayStr) => {
  const d = String(dateStr || "").slice(0, 10);
  if (!d) return "No date";
  const [y, m, day] = d.split("-").map(Number);
  const sameYear = d.slice(0, 4) === String(todayStr).slice(0, 4);
  const text = new Date(Date.UTC(y, m - 1, day, 12)).toLocaleDateString("en-US", {
    ...DAY_FORMAT,
    ...(sameYear ? {} : { year: "numeric" }),
  });
  if (d === todayStr) return `Today · ${text}`;
  if (d === addDaysToDateStr(todayStr, -1)) return `Yesterday · ${text}`;
  if (d === addDaysToDateStr(todayStr, 1)) return `Tomorrow · ${text}`;
  return text;
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

/**
 * The tag a Ledger row carries: unpaid and dated before today is "Overdue" (red), unpaid and
 * dated today is "Due today" (amber). Paid rows and upcoming rows get none (upcoming rows are
 * dimmed instead). todayStr is Toronto's YYYY-MM-DD from getTorontoTodayStr.
 */
export const getLedgerRowTag = (row, todayStr) => {
  if (row?.is_paid) return null;
  const d = String(row?.date || "").slice(0, 10);
  if (!d) return null;
  if (d < todayStr) return { label: "Overdue", tone: "overdue" };
  if (d === todayStr) return { label: "Due today", tone: "today" };
  return null;
};
