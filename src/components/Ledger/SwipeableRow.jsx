import { useRef, useState } from "react";
import { Check, Trash2 } from "lucide-react";
import {
  getSwipeAxis,
  getSwipeOffset,
  settleSwipe,
  getOpenOffset,
  SWIPE_OPEN_PX,
} from "../../utils/swipeGesture";

/**
 * A Ledger row on touch screens. Swipe left to show Delete, swipe right to show Mark paid
 * (only when canMarkPaid). Only one row is open at a time: the page owns openAction.
 */
const SwipeableRow = ({
  openAction,
  onOpenChange,
  canMarkPaid,
  markPaidLabel = "Mark paid",
  onDelete,
  onMarkPaid,
  onTap,
  children,
}) => {
  const [dragX, setDragX] = useState(null);
  const touch = useRef(null);
  const swiped = useRef(false);
  const options = { canDelete: true, canMarkPaid };
  const offset = dragX ?? getOpenOffset(openAction);

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    touch.current = { x: t.clientX, y: t.clientY, base: getOpenOffset(openAction), axis: null };
    swiped.current = false;
  };

  const handleTouchMove = (e) => {
    const start = touch.current;
    if (!start) return;
    const t = e.touches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (!start.axis) start.axis = getSwipeAxis(dx, dy);
    if (start.axis === "x") {
      start.lastX = getSwipeOffset(start.base + dx, options);
      setDragX(start.lastX);
    }
  };

  const handleTouchEnd = () => {
    const start = touch.current;
    touch.current = null;
    if (start?.axis === "x" && start.lastX !== undefined) {
      swiped.current = true;
      onOpenChange(settleSwipe(start.lastX, options));
    }
    setDragX(null);
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
        onTouchCancel={handleTouchEnd}
        onClick={handleClick}
        style={{
          transform: offset ? `translateX(${offset}px)` : undefined,
          transition: dragX === null ? "transform 180ms ease-out" : "none",
          touchAction: "pan-y",
        }}
        className="relative bg-[#101012] cursor-pointer"
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRow;
