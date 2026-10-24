/* global process */
import {
  normalizeMonthlyPayment,
  checkSolvency,
  simulate,
  comparePlans,
  getPeriodInterest,
} from "./debtMath.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   DEBT MATH & PAYOFF SIMULATION UNIT TESTS       ");
console.log("==================================================");

// Test 1: Payment normalization
console.log("\n--- Test 1: Payment Normalization ---");
assert(Math.abs(normalizeMonthlyPayment(100, "monthly") - 100) < 0.001, "Monthly $100 -> $100");
assert(Math.abs(normalizeMonthlyPayment(100, "bi-weekly") - 216.67) < 0.01, "Bi-weekly $100 -> ~$216.67");
assert(Math.abs(normalizeMonthlyPayment(100, "weekly") - 433.33) < 0.01, "Weekly $100 -> ~$433.33");
assert(Math.abs(normalizeMonthlyPayment(1200, "yearly") - 100) < 0.001, "Yearly $1200 -> $100");

// Test 2: Standard Known Amortization Value ($10,000 at 6.9% with $350/mo)
console.log("\n--- Test 2: Known Amortization ($10k @ 6.9% with $350/mo) ---");
const testDebt = {
  id: "test-debt-1",
  name: "Car Loan",
  total_remaining: 10000,
  monthly_payment: 350,
  payment_frequency: "monthly",
  interest_rate: 6.9,
};

const result = simulate([testDebt], 0, "avalanche");
console.log(`  Payoff months: ${result.debtFreeMonth}, Total interest: $${result.totalInterest}`);
assert(result.debtFreeMonth === 32, "Payoff takes exactly 32 months (standard formula 31.3 -> 32)");
assert(result.totalInterest >= 900 && result.totalInterest <= 1150, `Total interest within expected amortization bounds (~$955 - $1,090, got $${result.totalInterest})`);

// Test 3: Solvency Guard (Payment <= Interest)
console.log("\n--- Test 3: Solvency Guard (Payment <= Interest) ---");
const insolventDebt = {
  id: "test-debt-bad",
  name: "Underpaid Card",
  total_remaining: 10000,
  monthly_payment: 50, // 6.9% interest on 10k is $57.50/mo, so $50 does not cover interest!
  payment_frequency: "monthly",
  interest_rate: 6.9,
};
const solvencyCheck = checkSolvency(10000, 50, 6.9);
assert(solvencyCheck.solvent === false, "checkSolvency flags payment $50 as insolvent for $10k @ 6.9%");
assert(solvencyCheck.monthlyInterest === 57.5, "Monthly interest calculated as $57.50");

const insolventSim = simulate([insolventDebt], 0, "avalanche");
assert(insolventSim.hasInsolventDebt === true, "simulate identifies insolvent debt");
assert(insolventSim.insolventDebts[0].name === "Underpaid Card", "insolvent debt correctly attributed");

// Test 4: Strategy Comparison (Avalanche vs Snowball with Extra Payment)
console.log("\n--- Test 4: Strategy Comparison with Extra Payment ---");
const debtsMulti = [
  {
    id: "card-a",
    name: "High APR Card",
    total_remaining: 5000,
    monthly_payment: 150,
    interest_rate: 22.99,
  },
  {
    id: "loan-b",
    name: "Low Balance Loan",
    total_remaining: 1500,
    monthly_payment: 100,
    interest_rate: 7.5,
  },
];

const avalanchePlan = simulate(debtsMulti, 200, "avalanche");
const snowballPlan = simulate(debtsMulti, 200, "snowball");

// Avalanche targets highest APR (Card A) first with extra payment
// Snowball targets lowest balance (Loan B) first with extra payment
console.log(`  Avalanche total interest: $${avalanchePlan.totalInterest}, Snowball total interest: $${snowballPlan.totalInterest}`);
assert(avalanchePlan.totalInterest <= snowballPlan.totalInterest, "Avalanche produces less or equal total interest than Snowball");

const comparison = comparePlans(debtsMulti, 200, "avalanche");
assert(comparison.interestSaved > 0, "Extra payment saves interest compared to baseline");
assert(comparison.monthsSaved > 0, "Extra payment saves months compared to baseline");

// Matches the backend sweep: $12,000 at 6.9% paying $350 a month (Suite 38: $69.00, $67.38, $65.76 ...)
assert(getPeriodInterest(12000, 6.9) === 69, "Monthly interest on $12,000 at 6.9% is $69.00, like the sweep's interest row");
assert(getPeriodInterest(11719, 6.9) === 67.38 && getPeriodInterest(11436.38, 6.9) === 65.76, "Months 2 and 3 match the sweep ($67.38, $65.76)");
assert(getPeriodInterest(500, 0) === 0 && getPeriodInterest(0, 6.9) === 0, "No interest at 0% APR or $0 balance");
const sweepMatch = simulate([{ id: "s", name: "Car", total_remaining: 12000, monthly_payment: 350, interest_rate: 6.9 }], 0);
assert(
  sweepMatch.totalInterest === 1404.25 && sweepMatch.perDebt[0].payoffMonth === 39,
  `Planner total interest and payoff month match the backend projection ($1,404.25 in 39 months, got $${sweepMatch.totalInterest} in ${sweepMatch.perDebt[0].payoffMonth})`
);

console.log("\n==================================================");
console.log("   ALL DEBT MATH UNIT TESTS PASSED                ");
console.log("==================================================");
