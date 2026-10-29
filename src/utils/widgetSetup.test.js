/* global process */
import { kwgtFormula, WIDGET_FORMULAS } from "./widgetSetup.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   WIDGET SETUP (KWGT) UNIT TESTS                 ");
console.log("==================================================");

const URL = "https://fintrack-backend-rzrh.onrender.com/api/export/widget.json?key=ft_wdg_abc";

console.log("\n--- Test 1: KWGT formulas ---");
assert(
  kwgtFormula(URL, "safe_to_spend") === `$wg("${URL}", json, ".safe_to_spend")$`,
  "Formula is $wg(\"<url>\", json, \".safe_to_spend\")$"
);
assert(!kwgtFormula('https://x/?key="a', "status").includes('""'), "A quote in the URL can't break the formula");

console.log("\n--- Test 2: the suggested fields are the feed's flat keys ---");
// The backend's widget feed keys (services/widgetFeedService.js)
const FEED_KEYS = new Set([
  "as_of", "hide_amounts", "status", "safe_to_spend", "safe_to_spend_raw", "safe_until", "next_payday", "below_buffer",
  ...[1, 2, 3].flatMap((n) => [`bill${n}_title`, `bill${n}_date`, `bill${n}_amount`, `bill${n}_amount_raw`, `bill${n}_flag`]),
  "month_spent", "month_spent_raw", "month_budget", "month_budget_raw", "month_pct", "top_category",
  ...[1, 2, 3].flatMap((n) => [`card${n}_name`, `card${n}_balance`, `card${n}_balance_raw`, `card${n}_pct`, `card${n}_due`]),
  ...[1, 2, 3].flatMap((n) => [`goal${n}_name`, `goal${n}_saved`, `goal${n}_saved_raw`, `goal${n}_target`, `goal${n}_target_raw`, `goal${n}_pct`]),
]);
assert(WIDGET_FORMULAS.every((f) => FEED_KEYS.has(f.field)), "Every formula reads a field the feed sends");
assert(WIDGET_FORMULAS.filter((f) => f.bar).every((f) => f.field.endsWith("_pct")), "Bars read 0-100 percentages");
assert(new Set(WIDGET_FORMULAS.map((f) => f.field)).size === WIDGET_FORMULAS.length, "No field listed twice");

console.log("\nAll widget setup tests passed.");
