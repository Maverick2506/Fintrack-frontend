/* global process */
import { buildForecastCalendar, toCalendarDay, daysBelowBuffer, compactBalance } from "./forecastCalendar.js";
import { addDaysToDateStr } from "./dateUtils.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   FORECAST CALENDAR UNIT TESTS                   ");
console.log("==================================================");

// Oct 28 2026 (a Wednesday) to Nov 3: rent on the 1st takes the balance under the $200 buffer until payday
const forecast = {
  today: "2026-10-28",
  buffer: 200,
  lowestPoint: { date: "2026-11-01", balance: 50 },
  days: [
    { date: "2026-10-28", balance: 1250, items: [] },
    { date: "2026-10-29", balance: 1200, items: [{ title: "Phone", amount: -50 }] },
    { date: "2026-10-30", balance: 1200, items: [] },
    { date: "2026-10-31", balance: 1200, items: [] },
    { date: "2026-11-01", balance: 50, items: [{ title: "Rent", amount: -1100 }, { title: "Gym", amount: -50 }] },
    { date: "2026-11-02", balance: 200, items: [] },
    { date: "2026-11-03", balance: 2350, items: [{ title: "Paycheque", amount: 2150, estimated: true }, { title: "Card", amount: 0 }] },
  ],
};

const months = buildForecastCalendar(forecast);
assert(months.map((m) => m.key).join(",") === "2026-10,2026-11", "one grid per month the forecast touches");
assert(months[0].label === "October 2026", "month label");
assert(months.every((m) => m.weeks.every((w) => w.length === 7)), "every week has 7 slots");

const oct = months[0].weeks.flat();
assert(oct.slice(0, 4).every((s) => s === null) && oct[4].date === "2026-10-01", "Oct 1 2026 is a Thursday: 4 blanks first");
assert(oct.find((s) => s?.date === "2026-10-27").inForecast === false, "days before today are on the grid but not in the forecast");
const oct28 = oct.find((s) => s?.date === "2026-10-28");
assert(oct28.inForecast && oct28.isToday && oct28.balance === 1250 && !oct28.belowBuffer, "today shows its end-of-day balance");

const nov = months[1].weeks.flat();
assert(nov[0].date === "2026-11-01" && nov.filter(Boolean).length === 30, "Nov 1 2026 is a Sunday; all 30 days are placed");
const nov1 = nov[0];
assert(
  nov1.belowBuffer && nov1.isLowest && nov1.billsTotal === -1150 && nov1.bills.length === 2 && !nov1.isPayday,
  "the 1st: two bills, under the buffer, the lowest day"
);
assert(!nov.find((s) => s?.date === "2026-11-02").belowBuffer, "a balance equal to the buffer is not under it");
const nov3 = nov.find((s) => s?.date === "2026-11-03");
assert(
  nov3.isPayday && nov3.incomeTotal === 2150 && nov3.bills.length === 0 && nov3.balance === 2350,
  "payday: money in counted, a $0 item is neither a bill nor pay"
);
assert(nov.find((s) => s?.date === "2026-11-04").inForecast === false, "days after the forecast are not in it");
assert(daysBelowBuffer(forecast).join(",") === "2026-11-01", "only the 1st is under the buffer");

const cell = toCalendarDay({ date: "2026-12-05", balance: -40.456, items: [{ title: "x", amount: -10 }] }, { buffer: 0 });
assert(cell.balance === -40.46 && cell.belowBuffer && cell.day === 5, "a negative balance is under a $0 buffer");
assert(buildForecastCalendar({ days: [] }).length === 0 && buildForecastCalendar(null).length === 0, "no forecast, no months");

// A 60-day forecast from Dec 15 crosses into the new year
const long = {
  today: "2026-12-15",
  buffer: 100,
  days: Array.from({ length: 60 }, (_, i) => ({ date: addDaysToDateStr("2026-12-15", i), balance: 500, items: [] })),
};
assert(buildForecastCalendar(long).map((m) => m.key).join(",") === "2026-12,2027-01,2027-02", "crosses the year end");

assert(
  compactBalance(2350) === "$2.4k" && compactBalance(950.4) === "$950" && compactBalance(-40) === "-$40" &&
    compactBalance(12500) === "$13k" && compactBalance(1000) === "$1k" && compactBalance(2500000) === "$2.5M",
  "short balances for the grid"
);

console.log("\nAll forecast calendar tests passed.");
