// Swipe on a Ledger row: left reveals Delete, right reveals Mark paid (unpaid rows only).

export const SWIPE_AXIS_LOCK_PX = 10; // movement before deciding between a swipe and a scroll
export const SWIPE_OPEN_PX = 88; // how far an opened row sits, the width of the action button
export const SWIPE_THRESHOLD_PX = 48; // a row released past this stays open
export const LONG_PRESS_MS = 450; // holding a row this long without moving starts selection mode

/**
 * Decides whether a touch is a sideways swipe ("x") or a page scroll ("y").
 * Returns null until the finger has moved far enough to tell.
 */
export const getSwipeAxis = (dx, dy, lockPx = SWIPE_AXIS_LOCK_PX) => {
  if (Math.abs(dx) < lockPx && Math.abs(dy) < lockPx) return null;
  return Math.abs(dx) > Math.abs(dy) ? "x" : "y";
};

/**
 * Where the row sits while the finger drags. It cannot move towards an action the row
 * does not have, and past the open position it moves at a third of the speed.
 */
export const getSwipeOffset = (offset, { canDelete = true, canMarkPaid = false } = {}) => {
  let x = offset;
  if (x < 0 && !canDelete) x = 0;
  if (x > 0 && !canMarkPaid) x = 0;
  const over = Math.abs(x) - SWIPE_OPEN_PX;
  if (over > 0) x = Math.sign(x) * (SWIPE_OPEN_PX + over / 3);
  return x;
};

/** Which action stays revealed when the finger lifts: "delete", "markPaid" or null (closed). */
export const settleSwipe = (offset, { canDelete = true, canMarkPaid = false } = {}) => {
  if (offset <= -SWIPE_THRESHOLD_PX && canDelete) return "delete";
  if (offset >= SWIPE_THRESHOLD_PX && canMarkPaid) return "markPaid";
  return null;
};

/** Resting offset for a revealed action. */
export const getOpenOffset = (action) =>
  action === "delete" ? -SWIPE_OPEN_PX : action === "markPaid" ? SWIPE_OPEN_PX : 0;
