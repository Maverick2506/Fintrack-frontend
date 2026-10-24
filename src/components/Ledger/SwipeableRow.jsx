import { useEffect, useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  getSwipeAxis,
  getSwipeOffset,
  settleSwipe,
  getOpenOffset,
  SWIPE_OPEN_PX,
  LONG_PRESS_MS,
} from "../../utils/swipeGesture";

/**
 * A Ledger row on touch screens. Swipe left to show Delete, swipe right to show Mark paid
 * (only when canMarkPaid). Only one row is open at a time: the page owns openAction.
 * Holding the row still calls onLongPress (starts selection mode); swipeEnabled=false turns
 * swiping off, e.g. while selecting, so a tap only calls onTap.
 */
const SwipeableRow = ({
  openAction,
  onOpenChange,
  canMarkPaid,
  markPaidLabel = "Mark paid",
  onDelete,
  onMarkPaid,
  onTap,
  onLongPress,
  swipeEnabled = true,
  children,
}) => {
  const [dragX, setDragX] = useState(null);
  const touch = useRef(null);
  const swiped = useRef(false);
  const longPressTimer = useRef(null);
  const options = { canDelete: true, canMarkPaid };
  const offset = swipeEnabled ? dragX ?? getOpenOffset(openAction) : 0;

  const cancelLongPress = () => {
    clearTimeout(longPressTimer.current);
    longPressTimer.current = null;
  };
  useEffect(() => cancelLongPress, []);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, base: getOpenOffset(openAction), axis: null };
    swiped.current = false;
    cancelLongPress();
    if (onLongPress && !openAction) {
      longPressTimer.current = setTimeout(() => {
        longPressTimer.current = null;
        touch.current = null;
        // The click that follows the finger lifting must not also open the row
        swiped.current = true;
        navigator.vibrate?.(10);
        onLongPress();
      }, LONG_PRESS_MS);
    }
  };

  const handleTouchMove = (e) => {
    const start = touch.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!start.axis) start.axis = getSwipeAxis(dx, dy);
    if (start.axis) cancelLongPress();
    if (start.axis === "x" && swipeEnabled) {
      start.lastX = getSwipeOffset(start.base + dx, options);
      setDragX(start.lastX);
    }
  };

  const handleTouchEnd = () => {
    cancelLongPress();
    const start = touch.current;
    touch.current = null;
    if (start?.axis === "x" && start.lastX !== undefined) {
      swiped.current = true;
      onOpenChange(settleSwipe(start.lastX, options));
    }
    setDragX(null);
  };

  // A cancelled drag (e.g. a system gesture took over) closes the row instead of settling by position
  const handleTouchCancel = () => {
    cancelLongPress();
    const wasSwiping = touch.current?.axis === "x";
    touch.current = null;
    setDragX(null);
    if (wasSwiping) onOpenChange(null);
  };

  const handleClick = (e) => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    if (e.target.closest("button")) return;
    if (openAction) onOpenChange(null);
    else onTap?.();
  };

  return (
    <div className="relative overflow-hidden">
      {offset > 0 && (
        <div className="absolute inset-y-0 left-0 flex bg-emerald-600/90">
          <button
            type="button"
            onClick={onMarkPaid}
            tabIndex={openAction === "markPaid" ? 0 : -1}
            style={{ width: SWIPE_OPEN_PX }}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white cursor-pointer"
          >
            <Check size={16} strokeWidth={2.5} />
            <span>{markPaidLabel}</span>
          </button>
        </div>
      )}
      {offset < 0 && (
        <div className="absolute inset-y-0 right-0 flex bg-rose-600/90">
          <button
            type="button"
            onClick={onDelete}
            tabIndex={openAction === "delete" ? 0 : -1}
            style={{ width: SWIPE_OPEN_PX }}
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white cursor-pointer"
          >
            <Trash2 size={16} />
            <span>Delete</span>
          </button>
        </div>
      )}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onClick={handleClick}
        // No text selection or iOS link menu while holding a row
        onContextMenu={onLongPress ? (e) => e.preventDefault() : undefined}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: dragX === null ? "transform 180ms ease-out" : "none",
          touchAction: "pan-y",
          WebkitTouchCallout: "none",
        }}
        className="relative bg-[#101012] cursor-pointer select-none"
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRow;
