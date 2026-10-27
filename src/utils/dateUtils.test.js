/* global process */
import {
  getTorontoTodayStr,
  getTorontoYearMonth,
  getTorontoTodayDate,
  addDaysToDateStr,
  dueDateOnOpen,
} from "./dateUtils.js";
import { simulate } from "./debtMath.js";
import { calculatePacing } from "./savingsPacing.js";

let failed = 0;
function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// Node applies a new TZ as soon as it is set, so each block below runs "on a phone" in that zone.
const originalTZ = process.env.TZ;
const onPhoneIn = (tz, fn) => {
  process.env.TZ = tz;
  try {
    fn();
  } finally {
    if (originalTZ === undefined) delete process.env.TZ;
    else process.env.TZ = originalTZ;
  }
};
const PHONES = ["America/Vancouver", "Europe/London"];

console.log("--- Test 1: Sat Oct 31, 23:30 in Toronto (London is already Nov 1) ---");
const halloweenNight = new Date("2026-11-01T03:30:00Z");
for (const tz of PHONES) {
  onPhoneIn(tz, () => {
    // Debt Pay / auto-pay dialogs, Subscriptions default date
    assert(getTorontoTodayStr(halloweenNight) === "2026-10-31", `${tz}: today is 2026-10-31`);
    // Dashboard and Reports start on this month
    const ym = getTorontoYearMonth(halloweenNight);
    assert(ym.year === 2026 && ym.month === 10, `${tz}: this month is October 2026`);
    const d = getTorontoTodayDate(halloweenNight);
    assert(
      d.getFullYear() === 2026 && d.getMonth() === 9 && d.getDate() === 31,
      `${tz}: Toronto's day as a phone Date is Oct 31`
    );
    assert(addDaysToDateStr(getTorontoTodayStr(halloweenNight), 1) === "2026-11-01", `${tz}: tomorrow is Nov 1 (across the DST change)`);
  });
}
onPhoneIn("Europe/London", () => {
  assert(halloweenNight.getMonth() === 10, "[setup] the phone in London already shows November");
});

console.log("\n--- Test 2: Sun Nov 1, 00:30 in Toronto (Vancouver is still Oct 31) ---");
const justAfterMidnight = new Date("2026-11-01T04:30:00Z");
for (const tz of PHONES) {
  onPhoneIn(tz, () => {
    assert(getTorontoTodayStr(justAfterMidnight) === "2026-11-01", `${tz}: today is 2026-11-01`);
    const ym = getTorontoYearMonth(justAfterMidnight);
    assert(ym.year === 2026 && ym.month === 11, `${tz}: this month is November 2026`);
  });
}
onPhoneIn("America/Vancouver", () => {
  assert(justAfterMidnight.getMonth() === 9, "[setup] the phone in Vancouver still shows October");
});

console.log("\n--- Test 3: Dec 31, 23:30 in Toronto: contribution room year ---");
const newYearsEve = new Date("2027-01-01T04:30:00Z");
for (const tz of PHONES) {
  onPhoneIn(tz, () => {
    assert(getTorontoYearMonth(newYearsEve).year === 2026, `${tz}: room year is still 2026`);
    assert(getTorontoTodayStr(newYearsEve) === "2026-12-31", `${tz}: today is 2026-12-31`);
  });
}

console.log("\n--- Test 4: debt payoff and savings pace count from Toronto's day ---");
const debt = { id: "d1", name: "Loan", total_remaining: 1000, monthly_payment: 400, interest_rate: 0 };
const goal = { goal_amount: 1000, current_amount: 0, target_date: "2026-12-15" };
for (const tz of PHONES) {
  onPhoneIn(tz, () => {
    const sim = simulate([debt], 0, "avalanche", getTorontoTodayDate(halloweenNight));
    assert(sim.chartSeries[0].date === "2026-10-31", `${tz}: payoff chart starts on Oct 31`);
    assert(sim.debtFreeDate === "2027-01-31", `${tz}: debt-free in 3 months, Jan 31 2027 (got ${sim.debtFreeDate})`);
    const pace = calculatePacing(goal, "monthly", getTorontoTodayDate(halloweenNight));
    assert(pace.monthsLeft === 2 && pace.requiredPerMonth === 500, `${tz}: 2 months left to Dec 15, $500/month (got ${pace.monthsLeft})`);
  });
}

console.log("\n--- Test 5: no date passed in, the clock frozen at 23:30 Toronto on Oct 31 ---");
// A Date whose no-argument constructor and Date.now() return a fixed instant; dates built from values stay real
const RealDate = Date;
const freezeClockAt = (instant, fn) => {
  const fixed = instant.getTime();
  class FrozenDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) super(fixed);
      else super(...args);
    }
    static now() {
      return fixed;
    }
  }
  globalThis.Date = FrozenDate;
  try {
    fn();
  } finally {
    globalThis.Date = RealDate;
  }
};
for (const tz of PHONES) {
  onPhoneIn(tz, () => {
    freezeClockAt(halloweenNight, () => {
      assert(getTorontoTodayStr() === "2026-10-31", `${tz}: [setup] the frozen clock reads Oct 31 in Toronto`);
      const sim = simulate([debt], 0);
      assert(sim.chartSeries[0].date === "2026-10-31", `${tz}: payoff chart starts on Oct 31 (got ${sim.chartSeries[0].date})`);
      assert(sim.debtFreeDate === "2027-01-31", `${tz}: debt-free Jan 31 2027 (got ${sim.debtFreeDate})`);
      const pace = calculatePacing(goal, "bi-weekly");
      assert(pace.monthsLeft === 2 && pace.requiredPerMonth === 500, `${tz}: 2 months left to Dec 15, $500/month (got ${pace.monthsLeft})`);
    });
  });
}
assert(Date === RealDate, "the real Date is back after the frozen clock");

console.log("\n--- Test 6: debt form's due date when the dialog opens ---");
// Page loaded on Oct 31 in Toronto, dialog opened after midnight on Nov 1
const openedToday = getTorontoTodayStr(justAfterMidnight);
assert(dueDateOnOpen({ today: openedToday }) === "2026-11-01", "Add Debt: nothing entered -> today at open, Nov 1");
assert(dueDateOnOpen({ entered: null, today: openedToday }) === "2026-11-01", "Add Debt: a stale default from before midnight is not kept");
assert(dueDateOnOpen({ entered: "2026-11-15", today: openedToday }) === "2026-11-15", "Add Debt: a date the user entered stays");
assert(dueDateOnOpen({ saved: "2026-11-20", today: openedToday }) === "2026-11-20", "Edit Debt: the saved date wins over today");
assert(dueDateOnOpen({ entered: "2026-11-15", saved: "2026-11-20", today: openedToday }) === "2026-11-15", "Edit Debt: a date the user entered wins over the saved one");
assert(dueDateOnOpen({ entered: "", saved: null, today: openedToday }) === "2026-11-01", "Edit Debt: no saved date and a cleared field -> today");

if (failed > 0) process.exit(1);
