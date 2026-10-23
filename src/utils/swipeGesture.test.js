/* global process */
import {
  getSwipeAxis,
  getSwipeOffset,
  settleSwipe,
  getOpenOffset,
  SWIPE_OPEN_PX,
  SWIPE_THRESHOLD_PX,
} from "./swipeGesture.js";

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exit(1);
  }
}

console.log("==================================================");
console.log("   LEDGER SWIPE GESTURE UNIT TESTS                ");
console.log("==================================================");

// Swipe or scroll
assert(getSwipeAxis(4, 3) === null, "a small wobble does not decide anything yet");
assert(getSwipeAxis(-20, 5) === "x", "mostly sideways is a swipe");
assert(getSwipeAxis(6, 30) === "y", "mostly vertical is a scroll");
assert(getSwipeAxis(12, 12) === "y", "a perfect diagonal is treated as a scroll");

const unpaid = { canDelete: true, canMarkPaid: true };
const paid = { canDelete: true, canMarkPaid: false };

// Dragging
assert(getSwipeOffset(-40, unpaid) === -40, "drags left freely up to the open position");
assert(getSwipeOffset(40, paid) === 0, "a paid row does not move right");
assert(getSwipeOffset(-40, { canDelete: false, canMarkPaid: true }) === 0, "a row that cannot be deleted does not move left");
assert(
  getSwipeOffset(-(SWIPE_OPEN_PX + 30), unpaid) === -(SWIPE_OPEN_PX + 10),
  "past the open position the row moves at a third of the speed"
);

// Release
assert(settleSwipe(-(SWIPE_THRESHOLD_PX - 1), unpaid) === null, "a short swipe left snaps back");
assert(settleSwipe(-SWIPE_THRESHOLD_PX, unpaid) === "delete", "swiping left past the threshold shows Delete");
assert(settleSwipe(SWIPE_THRESHOLD_PX + 20, unpaid) === "markPaid", "swiping right past the threshold shows Mark paid");
assert(settleSwipe(SWIPE_THRESHOLD_PX + 20, paid) === null, "a paid row never shows Mark paid");
assert(settleSwipe(SWIPE_THRESHOLD_PX - 1, unpaid) === null, "a short swipe right snaps back");
// Closing an open row: from -88, a 50px swipe right lands at -38, which closes it
assert(settleSwipe(-SWIPE_OPEN_PX + 50, unpaid) === null, "swiping an open row back closes it");

assert(getOpenOffset("delete") === -SWIPE_OPEN_PX, "Delete rests with the row moved left");
assert(getOpenOffset("markPaid") === SWIPE_OPEN_PX, "Mark paid rests with the row moved right");
assert(getOpenOffset(null) === 0, "closed rows rest at 0");

console.log("All swipe gesture tests passed.");
