import { addDaysToDateStr } from "./dateUtils.js";

// Quick Add example chips (R6): shown only until the first real entry is saved, with a relative due
// date so they never show a stale date like "due 11/05".

const WEEKDAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/** Short weekday ("fri") of a YYYY-MM-DD date */
export const weekdayOf = (dateStr) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay()];
};

/** Example entries for todayStr (Toronto today); the bill is due three days later, by weekday */
export const buildExampleChips = (todayStr) => [
  "23.40 lunch visa",
  `120 hydro due ${weekdayOf(addDaysToDateStr(todayStr, 3))}`,
  "+2100 paycheque",
  "4.50 coffee",
  "15.99 netflix amex",
];

// Samples older versions saved into the recent list along with real entries
export const LEGACY_SAMPLE_CHIPS = [
  "23.40 lunch visa",
  "120 hydro due 11/05",
  "+2100 paycheque",
  "4.50 coffee",
  "15.99 netflix amex",
];

/** Real recent entries from storage: strings only, old samples removed, at most 5 */
export const cleanRecentChips = (stored) => {
  if (!Array.isArray(stored)) return [];
  const legacy = new Set(LEGACY_SAMPLE_CHIPS.map((c) => c.toLowerCase()));
  return stored
    .filter((c) => typeof c === "string" && c.trim() && !legacy.has(c.toLowerCase()))
    .slice(0, 5);
};
