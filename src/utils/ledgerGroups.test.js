/* global process */
import {
  getLedgerGroupKey,
  groupLedgerRows,
  summarizeLedgerGroup,
  groupRowsByDay,
  getDayNet,
  formatDayLabel,
} from "./ledgerGroups.js";
import {
  getCategoryStyle,
  EXPENSE_CATEGORIES,
  CATEGORY_STYLES,
  DEFAULT_CATEGORY_STYLE,
  INCOME_STYLE,
  TRANSFER_STYLE,
} from "../constants/categories.js";
import { getTorontoTodayStr, addDaysToDateStr, getWeekStartStr } from "./dateUtils.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   LEDGER DATE GROUPING UNIT TESTS                ");
console.log("==================================================");

// Dates and Toronto "today"
assert(
  getTorontoTodayStr(new Date("2026-10-24T02:30:00Z")) === "2026-10-23",
  "10:30 pm in Toronto is still the 23rd even though UTC is already the 24th"
);
assert(
  getTorontoTodayStr(new Date("2026-10-23T04:30:00Z")) === "2026-10-23",
  "12:30 am in Toronto is the 23rd"
);
assert(addDaysToDateStr("2026-03-01", -1) === "2026-02-28", "a day before Mar 1 is Feb 28");
assert(addDaysToDateStr("2026-12-31", 1) === "2027-01-01", "a day after Dec 31 is Jan 1");
assert(getWeekStartStr("2026-10-23") === "2026-10-19", "the week of Fri Oct 23 starts Mon Oct 19");
assert(getWeekStartStr("2026-10-19") === "2026-10-19", "a Monday starts its own week");
assert(getWeekStartStr("2026-10-25") === "2026-10-19", "Sunday belongs to the week that began on Monday");

// Section of each date, with today = Fri Oct 23 2026
const today = "2026-10-23";
assert(getLedgerGroupKey("2026-10-24", today) === "upcoming", "tomorrow is Upcoming");
assert(getLedgerGroupKey("2026-10-23", today) === "today", "today is Today");
assert(getLedgerGroupKey("2026-10-23T00:00:00.000Z", today) === "today", "a timestamp counts by its date");
assert(getLedgerGroupKey("2026-10-22", today) === "yesterday", "Oct 22 is Yesterday");
assert(getLedgerGroupKey("2026-10-19", today) === "week", "Monday Oct 19 is This week");
assert(getLedgerGroupKey("2026-10-18", today) === "month:2026-10", "Sunday Oct 18 falls into October");
assert(getLedgerGroupKey("2026-09-30", today) === "month:2026-09", "Sep 30 falls into September");
assert(getLedgerGroupKey(null, today) === "undated", "a row without a date gets its own section");
// On a Monday, yesterday (Sunday) is last week and This week holds nothing extra
assert(getLedgerGroupKey("2026-10-18", "2026-10-19") === "yesterday", "on Monday, Sunday is Yesterday");
assert(getLedgerGroupKey("2026-10-17", "2026-10-19") === "month:2026-10", "on Monday, Saturday is in the month");

// Order of sections
const rows = [
  { id: 1, date: "2026-11-05", type: "expense", amount: 50 },
  { id: 2, date: "2026-10-24", type: "income", amount: 2000 },
  { id: 3, date: "2026-10-23", type: "expense", amount: 12.5 },
  { id: 4, date: "2026-10-22", type: "expense", amount: 8 },
  { id: 5, date: "2026-10-20", type: "transfer", amount: 100 },
  { id: 6, date: "2026-10-02", type: "expense", amount: 30 },
  { id: 7, date: "2026-09-15", type: "expense", amount: 40 },
  { id: 8, date: "2025-12-31", type: "expense", amount: 1 },
];
const groups = groupLedgerRows(rows, today);
assert(
  groups.map((g) => g.key).join(",") ===
    "upcoming,today,yesterday,week,month:2026-10,month:2026-09,month:2025-12",
  "newest first: Upcoming, Today, Yesterday, This week, then months"
);
assert(
  groups.map((g) => g.label).join(",") ===
    "Upcoming,Today,Yesterday,This week,October 2026,September 2026,December 2025",
  "sections have readable labels"
);
assert(groups[0].rows.map((r) => r.id).join(",") === "1,2", "Upcoming keeps the incoming row order when not sorting by date");
const byDate = groupLedgerRows(rows, today, { sortByDate: true });
assert(byDate[0].rows.map((r) => r.id).join(",") === "2,1", "sorted by date, Upcoming puts the soonest row first");
assert(byDate[4].rows.map((r) => r.id).join(",") === "6", "other sections keep the newest-first order");
const byDateAsc = groupLedgerRows([...rows].reverse(), today, { sortByDate: true, dateDir: "asc" });
assert(byDateAsc[0].rows.map((r) => r.id).join(",") === "2,1", "oldest first, Upcoming is still soonest first");

const ascGroups = groupLedgerRows(rows, today, { dateDir: "asc" });
assert(
  ascGroups.map((g) => g.key).join(",") ===
    "upcoming,month:2025-12,month:2026-09,month:2026-10,week,yesterday,today",
  "oldest first still puts Upcoming on top"
);

// Search and filters run before grouping: only sections with matching rows appear
const searched = groupLedgerRows(rows.filter((r) => r.id === 6 || r.id === 1), today);
assert(searched.map((g) => g.key).join(",") === "upcoming,month:2026-10", "empty sections are left out");
assert(groupLedgerRows([], today).length === 0, "no rows, no sections");

// Section totals
const upcoming = summarizeLedgerGroup(groups[0].rows);
assert(upcoming.count === 2, "Upcoming counts its rows");
assert(upcoming.moneyIn === 2000 && upcoming.moneyOut === 50, "Upcoming totals money in and out apart");
const week = summarizeLedgerGroup([{ type: "transfer", amount: "100.10" }, { type: "expense", amount: 0.2 }]);
assert(Math.abs(week.moneyOut - 100.3) < 1e-9, "transfers count as money out and string amounts are read");

// Days inside a section
const dayRows = [
  { id: "a", date: "2026-10-30", type: "expense", amount: 90 },
  { id: "b", date: "2026-10-26", type: "expense", amount: 45 },
  { id: "c", date: "2026-10-26", type: "expense", amount: 65 },
  { id: "d", date: "2026-11-02", type: "income", amount: 2400 },
  { id: "e", date: "2026-11-02", type: "expense", amount: 11.99 },
];
const upDays = groupRowsByDay(dayRows, "asc");
assert(upDays.map((d) => d.date).join(",") === "2026-10-26,2026-10-30,2026-11-02", "days run soonest first when asked");
assert(upDays[0].rows.map((r) => r.id).join(",") === "b,c", "rows keep their order inside a day");
assert(groupRowsByDay(dayRows).map((d) => d.date)[0] === "2026-11-02", "days run newest first by default");
assert(upDays[0].net === -110, "a day of two bills nets -$110");
assert(upDays[2].net === 2388.01, "a payday nets income minus spending, to the cent");
assert(
  getDayNet([{ type: "transfer", amount: 300 }, { type: "expense", amount: "4.75" }]) === -4.75,
  "transfers add nothing to a day's net and string amounts are read"
);
assert(getDayNet([{ type: "expense", amount: 0.1 }, { type: "expense", amount: 0.2 }]) === -0.3, "cents add up without float drift");
assert(getDayNet([]) === 0, "an empty day nets zero");
const undatedDays = groupRowsByDay([{ id: 1, date: null, type: "expense", amount: 1 }]);
assert(undatedDays.length === 1 && undatedDays[0].date === "", "rows without a date share one day");

const withDays = groupLedgerRows(rows, today);
assert(
  withDays[0].days.map((d) => d.date).join(",") === "2026-10-24,2026-11-05",
  "Upcoming days run soonest first even when history runs newest first"
);
assert(
  withDays.find((g) => g.key === "month:2026-10").days.map((d) => d.date).join(",") === "2026-10-02",
  "each section carries its days"
);
const monthRows = [
  { id: 1, date: "2026-10-02", type: "expense", amount: 1 },
  { id: 2, date: "2026-10-05", type: "expense", amount: 2 },
];
assert(
  groupLedgerRows(monthRows, today)[0].days.map((d) => d.date).join(",") === "2026-10-05,2026-10-02",
  "past days run newest first"
);
assert(
  groupLedgerRows(monthRows, today, { dateDir: "asc" })[0].days.map((d) => d.date).join(",") === "2026-10-02,2026-10-05",
  "past days run oldest first when sorting oldest first"
);

// Day header labels, today = Fri Oct 23 2026
assert(formatDayLabel("2026-10-25", today) === "Sun, Oct 25", "a day reads like Sun, Oct 25");
assert(formatDayLabel("2026-10-23", today) === "Today · Fri, Oct 23", "today says Today");
assert(formatDayLabel("2026-10-22T00:00:00.000Z", today) === "Yesterday · Thu, Oct 22", "yesterday says Yesterday");
assert(formatDayLabel("2026-10-24", today) === "Tomorrow · Sat, Oct 24", "tomorrow says Tomorrow");
assert(formatDayLabel("2025-12-31", today) === "Wed, Dec 31, 2025", "another year shows the year");
assert(formatDayLabel("", today) === "No date", "a missing date says No date");

// Category icons
assert(
  EXPENSE_CATEGORIES.every((c) => getCategoryStyle(c, "expense") === CATEGORY_STYLES[c]),
  "every expense category has its own icon"
);
assert(
  EXPENSE_CATEGORIES.every((c) => CATEGORY_STYLES[c] !== DEFAULT_CATEGORY_STYLE),
  "no expense category falls back to the default icon"
);
assert(getCategoryStyle("Gardening", "expense") === DEFAULT_CATEGORY_STYLE, "an unknown category gets the default icon");
assert(getCategoryStyle(undefined, "expense") === DEFAULT_CATEGORY_STYLE, "a missing category gets the default icon");
assert(getCategoryStyle("toString", "expense") === DEFAULT_CATEGORY_STYLE, "object built-ins are not categories");
assert(getCategoryStyle("Credit Card Payment", "transfer") === TRANSFER_STYLE, "transfers use the transfer icon whatever the category");
assert(TRANSFER_STYLE.icon === "ArrowLeftRight", "the transfer icon is ⇄");
assert(getCategoryStyle("Income", "income") === INCOME_STYLE, "income has its own icon");
assert(getCategoryStyle("Bonus", "income") === INCOME_STYLE, "income with another category still uses the income icon");

console.log("All ledger grouping tests passed.");
