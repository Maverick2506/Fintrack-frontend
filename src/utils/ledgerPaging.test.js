/* global process */
import {
  addMonthsToDateStr,
  olderWindowFrom,
  ledgerFetchParams,
  ledgerWindowNote,
  ledgerMonthOptions,
  windowFromForMonth,
} from "./ledgerPaging.js";
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

console.log("\n--- Test 5: The Month filter offers months not loaded yet ---");
const loaded = ["2026-11", "2026-10", "2026-09", "2026-08", "2026-07"];
const months = ledgerMonthOptions(loaded, { windowFrom: "2026-07-28", hasMore: true, todayStr: "2026-10-28" });
assert(months[0] === "2026-11" && months.includes("2026-03") && months[months.length - 1] === "2024-10", `With older rows waiting, the list goes back 24 months (got ${months.length}, last ${months[months.length - 1]})`);
assert(new Set(months).size === months.length, "No month twice");
assert(JSON.stringify(ledgerMonthOptions(loaded, { windowFrom: "2026-07-28", hasMore: false, todayStr: "2026-10-28" })) === JSON.stringify(loaded), "With everything loaded, only months that have rows");
assert(windowFromForMonth("2026-03", "2026-07-28") === "2026-03-01", "Picking March loads from March 1");
assert(windowFromForMonth("2026-07", "2026-07-28") === "2026-07-01", "Picking the window's own first month loads the whole month");
assert(windowFromForMonth("2026-09", "2026-07-28") === null && windowFromForMonth("all", "2026-07-28") === null, "A loaded month needs nothing more");

console.log("\nAll ledgerPaging tests passed.");
