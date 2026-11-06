/* global process */
import { debtPaymentRows, debtPayPrefill, mergeUpcoming, inMonth } from "./debtPaymentRows.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   MANUAL DEBT PAYMENTS IN UPCOMING BILLS         ");
console.log("==================================================");

const debts = [
  { id: "car", name: "Car Loan", initialBalance: "7500.00", minimumPayment: "350.00" },
  { id: "phone", name: "Phone", initialBalance: "40.00", minimumPayment: "75.00" },
];
const payments = [
  { debtId: "car", name: "Car Loan", title: "Car Loan payment", dueDate: "2026-11-15", date: "2026-11-15", amount: 350, overdue: false, balance: 7500, minimumPayment: 350 },
  { debtId: "phone", name: "Phone", title: "Phone payment", dueDate: "2026-11-05", date: "2026-11-06", amount: 40, overdue: true, balance: 40, minimumPayment: 75 },
];

console.log("\n--- Test 1: rows ---");
const rows = debtPaymentRows(payments, debts, "2026-11-06");
assert(rows.length === 2 && rows[0].key === "debt-payment:car" && rows[0].title === "Car Loan payment" && rows[0].amount === 350, "One row per payment, titled '<debt> payment'");
assert(rows[0].overdue === false && rows[1].overdue === true, "Overdue when the due date is before Toronto's today");
assert(debtPaymentRows(payments, debts, "2026-11-05")[1].overdue === false, "Due today is not overdue");
assert(rows[0].debt === debts[0] && debtPaymentRows([{ ...payments[0], debtId: "gone" }], debts, "2026-11-06")[0].debt === null, "Row carries its debt for the Pay dialog");
assert(debtPaymentRows(undefined, debts, "2026-11-06").length === 0, "No payments, no rows");

console.log("\n--- Test 2: Pay prefill ---");
assert(debtPayPrefill(rows[0]) === "350.00", "Pay opens with the minimum payment");
assert(debtPayPrefill(rows[1]) === "40.00", "Never more than the balance owed");
assert(debtPayPrefill({ minimumPayment: 0, balance: 100 }) === "", "No minimum payment, nothing prefilled");
assert(debtPayPrefill({ minimumPayment: 12.345, balance: 100 }) === "12.35", "Rounded to cents");

assert(
  debtPayPrefill({ debt: { initialBalance: "7500", total_remaining: "100", minimumPayment: "350" }, minimumPayment: 350, balance: 100 }) === "100.00",
  "Cap reads total_remaining first, like the Pay dialog"
);
assert(debtPayPrefill({ debt: { initialBalance: "500", monthly_payment: "60", minimumPayment: "40" } }) === "60.00", "Minimum reads monthly_payment first, like the Pay dialog");
const noDebt = debtPaymentRows(payments, undefined, "2026-11-06");
assert(noDebt[0].debt === null && debtPayPrefill(noDebt[0]) === "350.00" && debtPayPrefill(noDebt[1]) === "40.00", "Debts not loaded yet: the row's own balance and minimum still prefill");

console.log("\n--- Test 2b: month filter ---");
assert(inMonth(rows, "2026-11-01", "2026-11-30").length === 2 && inMonth(rows, "2026-12-01", "2026-12-31").length === 0, "Only rows dated in the selected month");

console.log("\n--- Test 3: merged with bills by date ---");
const bills = [
  { id: "b1", title: "Rent", date: "2026-11-06" },
  { id: "b2", title: "Hydro", date: "2026-11-20" },
];
const merged = mergeUpcoming(bills, rows);
assert(
  merged.map((m) => (m.kind === "bill" ? m.bill.title : m.row.title)).join(",") === "Phone payment,Rent,Car Loan payment,Hydro",
  `Sorted by date, overdue debt payment first on its day (got ${merged.map((m) => (m.kind === "bill" ? m.bill.title : m.row.title)).join(",")})`
);

const isoBills = mergeUpcoming([{ id: "x", title: "ISO bill", date: "2026-11-15T00:00:00.000Z" }], [rows[0]]);
assert(isoBills[0].kind === "bill" && isoBills[0].date === "2026-11-15", "Timestamped bill dates compare by day; a same-day bill stays ahead of a non-overdue debt row");

console.log("\n==================================================");
console.log("   ALL MANUAL DEBT PAYMENT TESTS PASSED");
console.log("==================================================");
