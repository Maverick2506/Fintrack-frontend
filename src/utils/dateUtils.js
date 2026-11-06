/** Today's date in Toronto as YYYY-MM-DD, whatever the device's time zone. */
export const getTorontoTodayStr = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

/** Toronto's current year and month (1-12), whatever the device's time zone. */
export const getTorontoYearMonth = (now = new Date()) => {
  const [year, month] = getTorontoTodayStr(now).split("-").map(Number);
  return { year, month };
};

/**
 * Toronto's calendar day as a device-local Date at noon, for code that does
 * local Date math (getFullYear/getMonth/setMonth) and should count from Toronto's day.
 */
export const getTorontoTodayDate = (now = new Date()) => {
  const [y, m, d] = getTorontoTodayStr(now).split("-").map(Number);
  return new Date(y, m - 1, d, 12);
};

/**
 * The due date a form shows when it opens: a date the user already entered wins,
 * then the saved date, then Toronto's today (worked out at open, not when the page loaded).
 */
export const dueDateOnOpen = ({ entered, saved, today }) => entered || saved || today;

/** Toronto's month as "YYYY-MM", whatever the device's time zone. */
export const getTorontoMonthKey = (now = new Date()) => getTorontoTodayStr(now).slice(0, 7);

/** "YYYY-MM" for a year and a 1-12 month. */
export const monthKey = (year, month) => `${year}-${String(month).padStart(2, "0")}`;

/**
 * The month a page should show after Toronto's month changes from lastCurrent to nowCurrent
 * (all "YYYY-MM"). A page on the old current month moves to the new one; a month the user
 * picked themselves stays.
 */
export const followCurrentMonth = (selected, lastCurrent, nowCurrent) =>
  selected === lastCurrent ? nowCurrent : selected;

/**
 * Edit Debt's Next Payment Date field, kept as { value, edited }.
 * openDueDate: on open, a date typed in this sitting wins, then the saved date, then today.
 * typeDueDate: the user picked a date.
 * closeDueDate: closing without saving drops the typed date, so the next open shows the saved one.
 */
export const openDueDate = (field, { saved, today }) => ({
  value: dueDateOnOpen({ entered: field.edited ? field.value : null, saved, today }),
  edited: field.edited,
});
export const typeDueDate = (value) => ({ value, edited: true });
export const closeDueDate = (field) => ({ ...field, edited: false });

/** Adds whole days to a YYYY-MM-DD string. */
export const addDaysToDateStr = (dateStr, days) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days, 12));
  return date.toISOString().slice(0, 10);
};

/** Monday of the week that holds a YYYY-MM-DD date. */
export const getWeekStartStr = (dateStr) => {
  const [y, m, d] = String(dateStr).slice(0, 10).split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay(); // 0 = Sunday
  return addDaysToDateStr(dateStr, -((weekday + 6) % 7));
};
