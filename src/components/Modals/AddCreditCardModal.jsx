import { useState, useEffect } from "react";
import { X, CreditCard, Calendar } from "lucide-react";
import dashboardService from "../../services/dashboardService";

const AddCreditCardModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [currentBalance, setCurrentBalance] = useState("");
  const [dueDate, setDueDate] = useState("");

  const clearForm = () => {
    setName("");
    setCreditLimit("");
    setCurrentBalance("");
    setDueDate("");
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        clearForm();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !creditLimit) return;

    const payload = {
      name,
      creditLimit: creditLimit,
      currentBalance: currentBalance || "0",
      dueDate: dueDate || null,
    };

    try {
      await dashboardService.addCreditCard(payload);
      clearForm();
      onClose();
      refreshData();
    } catch (error) {
      console.error("Submit failed:", error);
    }
  };

  const handleClose = () => {
    clearForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={handleClose}
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
              Add Credit Card
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn-ghost-icon"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div className="py-3 px-4 rounded-xl bg-zinc-950/70 border border-white/[0.06]">
            <label
              htmlFor="creditLimit"
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
                id="creditLimit"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                required
                step="0.01"
                placeholder="5000.00"
                autoFocus
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
              <CreditCard size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                id="cardName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                placeholder="Card name (e.g., Amex Cobalt, Visa Infinite)"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
              <label
                htmlFor="currentBalance"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Current Balance
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-zinc-500">$</span>
                <input
                  type="number"
                  id="currentBalance"
                  value={currentBalance}
                  onChange={(e) => setCurrentBalance(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-zinc-200 placeholder-zinc-600 focus:outline-none tabular-nums"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
              <label
                htmlFor="dueDate"
                className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1"
              >
                <Calendar size={11} /> Statement Due
              </label>
              <input
                type="date"
                id="dueDate"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-zinc-200 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditCardModal;
