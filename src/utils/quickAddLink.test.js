/* global process */
import {
  parseQuickAddTextParam,
  withoutTextParam,
  getSafeNextPath,
  buildLoginPath,
  MAX_LINK_LINES,
} from "./quickAddLink.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("==================================================");
console.log("   QUICK ADD LINK (?text=) UNIT TESTS             ");
console.log("==================================================");

console.log("\n--- Test 1: Reading ?text= ---");
assert(same(parseQuickAddTextParam("?text=23.40%20lunch%20visa"), ["23.40 lunch visa"]), "Single entry is decoded");
assert(
  same(parseQuickAddTextParam("?text=23.40%20lunch%20visa%0A%2B2100%20paycheque%0D%0A120%20hydro%20due%2011%2F05"), [
    "23.40 lunch visa",
    "+2100 paycheque",
    "120 hydro due 11/05",
  ]),
  "Several lines (\\n and \\r\\n) become one entry each, and + stays a plus"
);
assert(same(parseQuickAddTextParam("?text=4.50+coffee"), ["4.50 coffee"]), "A + used as a space in the query decodes to a space");
assert(same(parseQuickAddTextParam("?text=%2B2100+paycheque"), ["+2100 paycheque"]), "An encoded + for income is kept");
assert(same(parseQuickAddTextParam("?text=%0A%20%2012%20%20%20lunch%20%0A%0A"), ["12 lunch"]), "Blank lines and extra spaces are dropped");
assert(same(parseQuickAddTextParam(""), []) && same(parseQuickAddTextParam("?dev=1"), []) && same(parseQuickAddTextParam("?text="), []), "No text gives no entries");
assert(same(parseQuickAddTextParam(undefined), []), "Missing search string gives no entries");
const many = Array.from({ length: 30 }, (_, i) => `${i + 1} item`).join("\n");
assert(parseQuickAddTextParam(`?text=${encodeURIComponent(many)}`).length === MAX_LINK_LINES, `At most ${MAX_LINK_LINES} entries are loaded`);
assert(parseQuickAddTextParam(`?text=${"a".repeat(500)}`)[0].length === 200, "A very long line is cut to 200 characters");

console.log("\n--- Test 2: Clearing ?text= after loading ---");
assert(withoutTextParam("?text=4.50%20coffee") === "", "Only text: query string becomes empty");
assert(withoutTextParam("?dev=1&text=4.50%20coffee") === "?dev=1", "Other parameters are kept");

console.log("\n--- Test 3: Coming back after login ---");
const loginPath = buildLoginPath("/quick", "?text=23.40%20lunch%0A4.50%20coffee");
assert(loginPath === "/login?next=%2Fquick%3Ftext%3D23.40%2520lunch%250A4.50%2520coffee", "Login path carries the page and its text");
const back = getSafeNextPath(loginPath.slice("/login".length));
assert(back === "/quick?text=23.40%20lunch%0A4.50%20coffee", "After login, the same URL comes back unchanged");
assert(same(parseQuickAddTextParam(back.slice("/quick".length)), ["23.40 lunch", "4.50 coffee"]), "The text survives the round trip through login");
assert(buildLoginPath("/", "") === "/login", "The dashboard needs no next parameter");
assert(getSafeNextPath("") === "/", "No next goes to the dashboard");
assert(getSafeNextPath("?next=https%3A%2F%2Fevil.example") === "/", "A full URL is refused");
assert(getSafeNextPath("?next=%2F%2Fevil.example") === "/", "A protocol-relative URL is refused");
assert(getSafeNextPath("?next=%2F%5Cevil.example") === "/", "A backslash path is refused");
assert(getSafeNextPath("?next=%2Flogin") === "/", "Login never sends you back to login");

console.log("\nAll Quick Add link tests passed.");
