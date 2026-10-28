import { formatNumber } from "./formatUtils.js";

// Cash-flow calendar (F9): the forecast's days laid out as month grids. GET /forecast owns every
// number; this only places its days on the calendar and marks the ones under the buffer.

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const parts = (dateStr) => String(dateStr).slice(0, 10).split("-").map(Number);

/** Day of the week for a YYYY-MM-DD date, 0 = Sunday */
const weekdayOf = (dateStr) => {
  const [y, m, d] = parts(dateStr);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
};

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

const ymd = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const monthLabel = (y, m) =>
  new Date(Date.UTC(y, m - 1, 1, 12)).toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

/**
 * One forecast day as a calendar cell: its end-of-day balance, bills (money out) and paydays (money in),
 * and whether the balance is under the buffer.
 */
export const toCalendarDay = (day, { buffer = 0, today = null, lowestDate = null } = {}) => {
  const items = Array.isArray(day.items) ? day.items : [];
  const bills = items.filter((it) => it.amount < 0);
  const income = items.filter((it) => it.amount > 0);
  return {
    date: day.date,
    day: parts(day.date)[2],
    balance: round2(day.balance),
    bills,
    income,
    billsTotal: round2(bills.reduce((s, it) => s + it.amount, 0)),
    incomeTotal: round2(income.reduce((s, it) => s + it.amount, 0)),
    isPayday: income.length > 0,
    belowBuffer: round2(day.balance) < buffer,
    isToday: day.date === today,
    isLowest: day.date === lowestDate,
    inForecast: true,
  };
};

/**
 * The forecast as month grids, weeks starting Sunday. Each month is { key: "YYYY-MM", label, weeks },
 * and each week has 7 slots: null before the 1st and after the month's last day, a cell with
 * inForecast false for a day of the month the forecast doesn't cover, or a forecast day (toCalendarDay).
 */
export const buildForecastCalendar = (forecast) => {
  const days = forecast?.days || [];
  if (days.length === 0) return [];
  const buffer = Number(forecast.buffer) || 0;
  const options = { buffer, today: forecast.today || days[0].date, lowestDate: forecast.lowestPoint?.date || null };
  const byDate = new Map(days.map((d) => [d.date, toCalendarDay(d, options)]));

  const [firstY, firstM] = parts(days[0].date);
  const [lastY, lastM] = parts(days[days.length - 1].date);
  const months = [];
  for (let y = firstY, m = firstM; y < lastY || (y === lastY && m <= lastM); m === 12 ? (y++, (m = 1)) : m++) {
    const slots = Array(weekdayOf(ymd(y, m, 1))).fill(null);
    for (let d = 1; d <= daysInMonth(y, m); d++) {
      const date = ymd(y, m, d);
      slots.push(byDate.get(date) || { date, day: d, inForecast: false });
    }
    while (slots.length % 7 !== 0) slots.push(null);
    const weeks = [];
    for (let i = 0; i < slots.length; i += 7) weeks.push(slots.slice(i, i + 7));
    months.push({ key: `${y}-${String(m).padStart(2, "0")}`, label: monthLabel(y, m), weeks });
  }
  return months;
};

/** The forecast days under the buffer, in order */
export const daysBelowBuffer = (forecast) =>
  (forecast?.days || []).filter((d) => round2(d.balance) < (Number(forecast.buffer) || 0)).map((d) => d.date);

/** A balance short enough for a calendar cell: "$2.4k", "$950", "-$40" (the day's panel shows it in full) */
export const compactBalance = (amount) => {
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const short = (value, unit) =>
    `${sign}$${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: value >= 10 ? 0 : 1 })}${unit}`;
  if (abs >= 1000000) return short(abs / 1000000, "M");
  if (abs >= 1000) return short(abs / 1000, "k");
  return short(abs, "");
};
