import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType = "item",
  itemName = "",
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="bg-zinc-900 border border-white/[0.09] p-5 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 flex-shrink-0">
              <AlertTriangle size={16} />
            </div>
            <div>
              <h2 id="delete-dialog-title" className="text-sm font-semibold text-zinc-100">
                {title || `Delete ${itemType}?`}
              </h2>
              {itemName && (
                <p className="text-xs text-zinc-400 truncate max-w-[200px]">
                  {itemName}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-icon"
            aria-label="Close modal"
          >
            <X size={15} />
          </button>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed mb-5">
          {description || `This action is permanent and will remove this ${itemType} from your records.`}
        </p>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-3.5 py-1.5 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-medium rounded-lg transition-colors cursor-pointer"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
