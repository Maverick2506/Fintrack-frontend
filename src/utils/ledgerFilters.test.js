/* global process */
import { getActiveFilterChips, monthOptionLabel, SORT_OPTIONS } from "./ledgerFilters.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   LEDGER FILTER CHIP UNIT TESTS                  ");
console.log("==================================================");

const none = { typeFilter: "all", categoryFilter: "all", monthFilter: "all", sortKey: "date", sortDir: "desc" };
assert(getActiveFilterChips(none).length === 0, "no filters and the default sort show no chips");

const all = getActiveFilterChips({
  typeFilter: "expense",
  categoryFilter: "Food & Drink",
  monthFilter: "2026-10",
  sortKey: "amount",
  sortDir: "desc",
});
assert(all.map((c) => c.id).join(",") === "type,category,month,sort", "one chip per filter in use, in order");
assert(all.map((c) => c.label).join(",") === "Expense,Food & Drink,Oct 2026,Largest amount", "chips read like the sheet");
assert(
  getActiveFilterChips({ ...none, sortDir: "asc" }).map((c) => c.label).join(",") === "Oldest first",
  "oldest first is not the default, so it gets a chip"
);
assert(monthOptionLabel("2025-01") === "Jan 2025", "months read like Jan 2025 in any time zone");
assert(
  new Set(SORT_OPTIONS.map((o) => `${o.key}:${o.dir}`)).size === SORT_OPTIONS.length,
  "every sort option is distinct"
);

console.log("All ledger filter tests passed.");
