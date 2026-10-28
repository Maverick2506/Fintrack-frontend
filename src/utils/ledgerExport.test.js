/* global process */
import { ledgerExportQuery, exportFileName } from "./ledgerExport.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   LEDGER EXPORT UNIT TESTS                       ");
console.log("==================================================");

const none = { typeFilter: "all", categoryFilter: "all", monthFilter: "all", tagFilter: "all", search: "", sortKey: "date", sortDir: "desc" };
assert(ledgerExportQuery(none) === "sort=date%3Adesc", "no filters: only the sort");
const all = new URLSearchParams(
  ledgerExportQuery({ typeFilter: "expense", categoryFilter: "Food & Drink", monthFilter: "2026-02", tagFilter: "#Work", search: "  sam ", sortKey: "amount", sortDir: "asc" })
);
assert(
  all.get("type") === "expense" && all.get("category") === "Food & Drink" && all.get("from") === "2026-02-01" && all.get("to") === "2026-02-28" &&
    all.get("tag") === "work" && all.get("search") === "sam" && all.get("sort") === "amount:asc",
  "every Ledger filter is passed, a month as its first and last day"
);
assert(new URLSearchParams(ledgerExportQuery({ ...none, monthFilter: "2028-02" })).get("to") === "2028-02-29", "leap February");
assert(exportFileName('attachment; filename="fintrack-ledger-2026-10-28.csv"', "x") === "fintrack-ledger-2026-10-28.csv", "file name from the server");
assert(exportFileName(undefined, "2026-10-28") === "fintrack-ledger-2026-10-28.csv", "file name fallback");

console.log("\nAll ledger export tests passed.");
