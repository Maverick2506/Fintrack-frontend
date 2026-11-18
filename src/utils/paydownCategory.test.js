/* global process */
import { isPaydownCategory, isDebtCategory, PAYDOWN_CATEGORIES } from "./paydownCategory.js";
import { getCategoryStyle, CATEGORY_STYLES, DEFAULT_CATEGORY_STYLE, TRANSFER_STYLE } from "../constants/categories.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   DEBT PAYMENT CATEGORY                          ");
console.log("==================================================");

// Style lookup: Debt Payment looks like Debt
const debtStyle = getCategoryStyle("Debt", "expense");
const debtPaymentStyle = getCategoryStyle("Debt Payment", "expense");
assert(debtStyle.icon === "HandCoins" && debtStyle.tint.includes("rose"), "Debt keeps its HandCoins icon and rose tint");
assert(
  debtPaymentStyle.icon === debtStyle.icon && debtPaymentStyle.tint === debtStyle.tint && debtPaymentStyle !== DEFAULT_CATEGORY_STYLE,
  "Debt Payment has the same icon and tint as Debt, not the default"
);
assert(Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, "Debt Payment"), "CATEGORY_STYLES has a Debt Payment entry");
assert(getCategoryStyle("Debt Payment", "transfer") === TRANSFER_STYLE, "A debt payment row (a transfer) keeps the transfer icon, as Debt transfers did");
assert(getCategoryStyle(undefined, undefined) === DEFAULT_CATEGORY_STYLE, "An unknown category still gets the default");

// Modal helper: Debt Payment opens the pay-down picker like Debt
assert(isPaydownCategory("Debt") && isPaydownCategory("Debt Payment") && isPaydownCategory("Credit Card Payment"), "Debt, Debt Payment and Credit Card Payment show the pay-down target picker");
assert(!isPaydownCategory("Essentials") && !isPaydownCategory("Savings Transfer") && !isPaydownCategory(undefined), "Other categories don't");
assert(isDebtCategory("Debt") && isDebtCategory("Debt Payment"), "Debt and Debt Payment count as the Debt choice (Pay Full, no payment method)");
assert(!isDebtCategory("Credit Card Payment") && !isDebtCategory("Other"), "Credit Card Payment and Other are not the Debt choice");
assert(PAYDOWN_CATEGORIES.length === 3, "Three pay-down categories");

console.log("\nAll debt payment category tests passed.");
