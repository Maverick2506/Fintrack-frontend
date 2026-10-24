import { useEffect, useRef, useState } from "react";
import { Check, MoreHorizontal, Trash2 } from "lucide-react";

const MENU_WIDTH = 176;
const MENU_HEIGHT = 96;

/**
 * Always-visible ⋯ button on a pointer-screen Ledger row: Mark paid (or received) and Delete.
 * The menu is fixed-positioned so the list's rounded, clipped panel can't cut it off; it opens
 * upwards near the bottom of the window and closes on a click outside, Esc, scroll or resize.
 */
const RowActionsMenu = ({ rowName, isIncome, canMarkPaid, onMarkPaid, onDelete }) => {
  const [pos, setPos] = useState(null); // { top, left } while open
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        // Esc closes only the menu, not selection mode or a dialog underneath
        e.stopImmediatePropagation();
        close();
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    menuRef.current?.querySelector("button:not(:disabled)")?.focus();
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const toggle = () => {
    if (pos) {
      setPos(null);
      return;
    }
    const r = buttonRef.current.getBoundingClientRect();
    const opensUp = r.bottom + MENU_HEIGHT + 8 > window.innerHeight;
    setPos({
      top: opensUp ? r.top - MENU_HEIGHT - 4 : r.bottom + 4,
      left: Math.max(8, r.right - MENU_WIDTH),
    });
  };

  const choose = (action) => {
    setPos(null);
    action();
  };

  const paidLabel = isIncome ? "Mark received" : "Mark paid";
  const item =
    "w-full h-10 px-3 flex items-center gap-2 rounded-lg text-xs font-medium text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    // Clicks here must not reach the row, which opens Edit
    <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={Boolean(pos)}
        aria-label={`More actions for ${rowName}`}
        title="More actions"
        className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
          pos ? "bg-white/[0.08] text-zinc-100" : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06]"
        }`}
      >
        <MoreHorizontal size={16} />
      </button>
      {pos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: MENU_WIDTH }}
          className="z-50 p-1 rounded-xl bg-zinc-900 border border-white/[0.12] shadow-2xl"
        >
          <button
            type="button"
            role="menuitem"
            disabled={!canMarkPaid}
            onClick={() => choose(onMarkPaid)}
            className={`${item} text-zinc-200 hover:bg-white/[0.06] focus-visible:bg-white/[0.06] focus-visible:outline-none`}
          >
            <Check size={14} className="text-emerald-400" />
            {canMarkPaid ? paidLabel : isIncome ? "Already received" : "Already paid"}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => choose(onDelete)}
            className={`${item} text-rose-300 hover:bg-rose-500/10 focus-visible:bg-rose-500/10 focus-visible:outline-none`}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default RowActionsMenu;
