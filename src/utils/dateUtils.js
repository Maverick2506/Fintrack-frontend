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
