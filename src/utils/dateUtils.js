export const getLocalTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** Today's date in Toronto as YYYY-MM-DD, whatever the device's time zone. */
export const getTorontoTodayStr = (now = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);

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
