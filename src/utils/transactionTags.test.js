/* global process */
import { normalizeTag, addTags, matchesTag, collectTags, tagsOf, MAX_TAGS } from "./transactionTags.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   TRANSACTION TAGS UNIT TESTS                    ");
console.log("==================================================");

assert(normalizeTag("  #Work ") === "work" && normalizeTag("Trip   2026") === "trip 2026" && normalizeTag("##") === "", "tags are lowercase, no #, one space");
assert(JSON.stringify(addTags(["work"], "Work, #trip,, groceries ")) === JSON.stringify(["work", "trip", "groceries"]), "commas add several; repeats and blanks are skipped");
assert(addTags([], "x".repeat(40))[0].length === 30, "a long tag is cut to 30 characters");
const full = addTags([], Array.from({ length: 12 }, (_, i) => `t${i}`).join(","));
assert(full.length === MAX_TAGS, "no more than 10 tags");
assert(tagsOf({}).length === 0 && tagsOf({ tags: null }).length === 0, "a row without tags has none");

const rows = [
  { id: 1, tags: ["work", "trip"] },
  { id: 2, tags: ["work"] },
  { id: 3, tags: [] },
  { id: 4 },
];
assert(rows.filter((r) => matchesTag(r, "#WORK")).map((r) => r.id).join(",") === "1,2", "the tag filter ignores case and #");
assert(rows.filter((r) => matchesTag(r, "all")).length === 4, '"all" keeps every row');
assert(collectTags(rows).join(",") === "work,trip", "tag options: most used first");

console.log("\nAll transaction tag tests passed.");
