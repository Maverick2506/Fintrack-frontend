/* global process */
import { addMonthsToDateStr, olderWindowFrom, ledgerFetchParams, ledgerWindowNote } from "./ledgerPaging.js";
import { ledgerExportQuery } from "./ledgerExport.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   LEDGER PAGING UNIT TESTS (R5)                  ");
console.log("==================================================");

console.log("\n--- Test 1: Months back, at month ends and across years ---");
assert(addMonthsToDateStr("2026-10-28", -3) === "2026-07-28", "Oct 28 - 3 months = Jul 28 (matches the server's first page)");
assert(addMonthsToDateStr("2026-05-31", -3) === "2026-02-28", "May 31 - 3 months = Feb 28");
assert(addMonthsToDateStr("2024-05-31", -3) === "2024-02-29", "In a leap year, Feb 29");
assert(addMonthsToDateStr("2026-01-15", -3) === "2025-10-15", "Back across a new year");
assert(olderWindowFrom("2026-07-28") === "2026-04-28", "Load older asks for 3 more months");

console.log("\n--- Test 2: What the Ledger asks the server for ---");
assert(JSON.stringify(ledgerFetchParams({})) === "{}", "First load: the server's default window");
assert(JSON.stringify(ledgerFetchParams({ windowFrom: "2026-04-28" })) === JSON.stringify({ from: "2026-04-28" }), "After Load older: from= the oldest day");
assert(JSON.stringify(ledgerFetchParams({ windowFrom: "2026-04-28", search: "  hydro " })) === JSON.stringify({ search: "hydro" }), "A search covers all history (no from=)");
assert(ledgerFetchParams({ search: "x".repeat(300) }).search.length === 200, "A long search is cut to 200 characters");

console.log("\n--- Test 3: The note under the list ---");
assert(ledgerWindowNote({ from: "2026-07-28", hasMore: true }) === "Showing since Jul 28, 2026", "Older rows waiting");
assert(ledgerWindowNote({ from: "2026-07-28", hasMore: false }) === "All history loaded", "Nothing older");
assert(ledgerWindowNote({ searching: true }) === "Searching all history", "Searching");

console.log("\n--- Test 4: The CSV download holds the rows loaded ---");
assert(ledgerExportQuery({ windowFrom: "2026-07-28" }) === "from=2026-07-28", "No month filter: from= the loaded window");
assert(ledgerExportQuery({ windowFrom: "2026-07-28", monthFilter: "2026-08" }) === "from=2026-08-01&to=2026-08-31", "A month filter wins over the window");
assert(ledgerExportQuery({ windowFrom: "2026-07-28", search: "hydro" }) === "search=hydro", "A search exports its matches across all history");

console.log("\nAll ledgerPaging tests passed.");
