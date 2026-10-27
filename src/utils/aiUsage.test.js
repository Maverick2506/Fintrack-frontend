/* global process */
import { isAiCapError, formatAiUsage, parseAiCapInput } from "./aiUsage.js";
import { formatNumber } from "./formatUtils.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   AI USAGE AND DAILY LIMIT UNIT TESTS            ");
console.log("==================================================");

assert(isAiCapError({ response: { status: 429 } }), "a 429 is the daily limit, so no toast");
assert(!isAiCapError({ response: { status: 500 } }) && !isAiCapError(new Error("network")), "other errors still toast");
assert(!isAiCapError(undefined), "no error is not the limit");

assert(
  formatAiUsage({ calls: 7, cap: 100, totalTokens: 8421 }, formatNumber) === "Today: 7 of 100 AI requests · 8,421 tokens",
  "usage line reads calls, limit and tokens"
);
assert(formatAiUsage({ calls: 0, cap: 100 }, formatNumber).endsWith("· 0 tokens"), "missing tokens read as 0");
assert(formatAiUsage(undefined, formatNumber) === null, "no response: no line");
assert(formatAiUsage({ error: "x" }, formatNumber) === null, "unexpected shape: no line, never 'undefined'");
assert(formatAiUsage({ calls: "7", cap: 100 }, formatNumber) === null, "numbers as text are not trusted");

assert(parseAiCapInput("250") === 250 && parseAiCapInput(" 0 ") === 0, "whole numbers from 0 are accepted");
assert(parseAiCapInput("10000") === 10000 && parseAiCapInput("10001") === null, "the limit tops out at 10,000");
assert([null, "", "-1", "2.5", "abc", "1e3"].every((v) => parseAiCapInput(v) === null), "anything else is refused");

console.log("All AI usage tests passed.");
