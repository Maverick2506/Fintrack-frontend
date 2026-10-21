/* global process */
import {
  formatCurrency,
  formatNumber,
  formatShortDate,
  formatMonthYear,
} from "./formatUtils.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   FORMAT UTILS UNIT TESTS                        ");
console.log("==================================================");

console.log("\n--- Test 1: formatCurrency Options Robustness (B1 Bug Fix) ---");
assert(
  formatCurrency(-14069.99, { maximumFractionDigits: 0 }) === "-$14,070",
  "Rounds negative currency to whole dollar without RangeError (-$14,070)"
);
assert(
  formatCurrency(1234.5) === "$1,234.50",
  "Default formatCurrency preserves 2 decimals with thousands separator ($1,234.50)"
);
assert(
  formatCurrency(0) === "$0.00",
  "Formats zero as $0.00"
);
assert(
  formatCurrency(500, { maximumFractionDigits: 0 }) === "$500",
  "Positive whole dollar without decimals ($500)"
);
assert(
  formatCurrency(-50.45, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) === "-$50",
  "Negative whole dollar rounding (-$50)"
);
assert(
  formatCurrency(1234.5678, { minimumFractionDigits: 3, maximumFractionDigits: 3 }) === "$1,234.568",
  "Explicit 3 decimals supported ($1,234.568)"
);

console.log("\n--- Test 2: formatNumber Options Robustness ---");
assert(
  formatNumber(1234.5, { maximumFractionDigits: 0 }) === "1,235",
  "formatNumber rounds to integer when maximumFractionDigits: 0"
);
assert(
  formatNumber(1234.5) === "1,234.50",
  "formatNumber defaults to 2 decimals"
);

console.log("\n--- Test 3: Date Formatters ---");
assert(
  formatShortDate("2026-10-22") === "Oct 22",
  "formatShortDate produces 'Oct 22'"
);
assert(
  formatMonthYear("2026-10-22") === "Oct 2026",
  "formatMonthYear produces 'Oct 2026'"
);

console.log("==================================================");
console.log("   ALL FORMAT UTILS TESTS PASSED                  ");
console.log("==================================================");
