import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { UNDO_TOAST_MS, deletedMessage } from "../../utils/undoDelete";

// Pages that keep rows in local state (Ledger, Analytics, Trash) listen for this to re-read them
export const TRANSACTIONS_RESTORED_EVENT = "fintrack:transactions-restored";

/**
 * "Deleted 3 transactions · Undo" for 10 s after a delete. onUndo restores the ids.
 */
export const showUndoDeleteToast = (ids, onUndo) => {
  if (!ids || ids.length === 0) return;
  toast.custom(
    (t) => (
      <div
        role="status"
        className={`flex items-center gap-3 max-w-[calc(100vw-2rem)] pl-4 pr-1.5 py-1.5 rounded-xl bg-zinc-800 border border-white/[0.1] shadow-2xl text-sm text-zinc-100 ${
          t.visible ? "opacity-100" : "opacity-0"
        } transition-opacity`}
      >
        <Trash2 size={15} className="text-zinc-400 shrink-0" />
        <span className="min-w-0">{deletedMessage(ids.length)}</span>
        <button
          type="button"
          onClick={() => {
            toast.dismiss(t.id);
            Promise.resolve(onUndo(ids)).catch(() => {
              // The restore request already showed its own error toast
            });
          }}
          className="shrink-0 h-10 px-3.5 rounded-lg font-semibold text-emerald-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
        >
          Undo
        </button>
      </div>
    ),
    { duration: UNDO_TOAST_MS }
  );
};
