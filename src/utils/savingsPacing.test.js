/* global process */
import { calculatePacing } from "./savingsPacing.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   SAVINGS GOAL PACING UNIT TESTS                ");
console.log("==================================================");

// Fixed base date: 2026-10-20
const today = new Date(2026, 9, 20);

// Test 1: Goal reached
console.log("\n--- Test 1: Goal Reached ---");
const reachedGoal = {
  current_amount: 10000,
  goal_amount: 10000,
  target_date: "2027-10-20",
  contributedLast90Days: 500,
};
const reachedResult = calculatePacing(reachedGoal, "bi-weekly", today);
assert(reachedResult.status === "REACHED", "Status is REACHED when current >= target");
assert(reachedResult.requiredPerMonth === 0, "Required per month is 0");

// Test 2: No target date
console.log("\n--- Test 2: No Target Date ---");
const noTargetGoal = {
  current_amount: 2000,
  goal_amount: 10000,
  target_date: null,
};
const noTargetResult = calculatePacing(noTargetGoal, "bi-weekly", today);
assert(noTargetResult.status === "NO_TARGET_DATE", "Status is NO_TARGET_DATE when missing date");
assert(noTargetResult.copy === "Add a target date to get a monthly pace", "Displays helper prompt");

// Test 3: On Track pacing (Required $500/mo, contributed $1,800 in last 90 days = $600/mo average)
console.log("\n--- Test 3: On Track Pacing ---");
const onTrackGoal = {
  current_amount: 5000,
  goal_amount: 10000, // $5,000 left
  target_date: "2027-08-20", // 10 months away -> $500/mo
  contributedLast90Days: 1800, // $600/mo recent avg
};
const onTrackResult = calculatePacing(onTrackGoal, "bi-weekly", today);
assert(onTrackResult.status === "ON_TRACK", "Status is ON_TRACK when recent pace >= required pace");
assert(onTrackResult.requiredPerMonth === 500, "Required per month is exactly $500");
assert(Math.abs(onTrackResult.perPaycheque - 230.77) < 0.1, "Bi-weekly paycheque pace is ~$230.77 (500 / (26/12))");

// Test 4: Slightly Behind (Required $500/mo, recent avg $400/mo = 80% of pace)
console.log("\n--- Test 4: Slightly Behind (80% of pace) ---");
const slightlyBehindGoal = {
  current_amount: 5000,
  goal_amount: 10000,
  target_date: "2027-08-20", // $500/mo
  contributedLast90Days: 1200, // $400/mo recent avg (80%)
};
const slightlyBehindResult = calculatePacing(slightlyBehindGoal, "bi-weekly", today);
assert(slightlyBehindResult.status === "SLIGHTLY_BEHIND", "Status is SLIGHTLY_BEHIND when pace >= 75% but < 100%");

// Test 5: Behind (< 75% of pace)
console.log("\n--- Test 5: Behind (< 75% of pace) ---");
const behindGoal = {
  current_amount: 5000,
  goal_amount: 10000,
  target_date: "2027-08-20", // $500/mo
  contributedLast90Days: 600, // $200/mo recent avg (40%)
};
const behindResult = calculatePacing(behindGoal, "bi-weekly", today);
assert(behindResult.status === "BEHIND", "Status is BEHIND when pace < 75%");

console.log("\n==================================================");
console.log("   ALL SAVINGS PACING TESTS PASSED                ");
console.log("==================================================");
