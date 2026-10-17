import React from "react";

const ConfirmDeleteModal = ({
  isOpen,
  onClose,
  onConfirm,
  itemType = "item",
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-2 text-zinc-100">
          Delete {itemType}?
        </h2>
        <p className="text-xs text-zinc-400 leading-relaxed mb-6">
          This action is permanent and cannot be undone.
        </p>
        <div className="flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-semibold rounded-xl transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDeleteModal;
