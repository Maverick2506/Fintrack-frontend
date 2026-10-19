import { useState, useEffect } from "react";
import { X, CreditCard, Calendar } from "lucide-react";
import dashboardService from "../../services/dashboardService";

const EditCreditCardModal = ({ isOpen, onClose, refreshData, card }) => {
  const [name, setName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (card) {
      setName(card.name);
      setCreditLimit(card.creditLimit);
      setDueDate(
        card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""
      );
    }
  }, [card]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name || !creditLimit) return;

    setIsSubmitting(true);
    try {
      await dashboardService.updateCreditCard(card.id, {
        name,
        creditLimit,
        dueDate: dueDate || null,
      });
      onClose();
      refreshData();
    } catch (err) {
      console.error("Failed to update card:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/[0.09] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Revolving Credit
            </p>
            <h2 className="text-sm font-semibold text-zinc-100 mt-0.5">
              Edit Credit Card
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-icon"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div className="py-3 px-4 rounded-xl bg-zinc-950/70 border border-white/[0.06]">
            <label
              htmlFor="creditLimitEdit"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
            >
              Credit Limit
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-zinc-400 select-none">
                $
              </span>
              <input
                type="number"
                id="creditLimitEdit"
                step="0.01"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                required
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
              <CreditCard size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                id="cardNameEdit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3.5 py-2.5">
            <label
              htmlFor="dueDateEdit"
              className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1"
            >
              <Calendar size={11} /> Statement Due Date (Optional)
            </label>
            <input
              type="date"
              id="dueDateEdit"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-transparent text-xs font-medium text-zinc-200 focus:outline-none tabular-nums"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCreditCardModal;
