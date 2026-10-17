import { useState, useEffect } from "react";
import { X } from "lucide-react";
import dashboardService from "../../services/dashboardService";

const AddDebtPaymentModal = ({ isOpen, onClose, refreshData, debtId }) => {
  const [amount, setAmount] = useState("");

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
    if (!debtId || !amount) return;

    try {
      await dashboardService.payDebt(debtId, {
        amount: amount,
        payment_date: new Date().toISOString().slice(0, 10),
      });
      setAmount("");
      onClose();
      refreshData();
    } catch (error) {
      console.error("Error logging debt payment:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/[0.09] rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Paydown
            </p>
            <h2 className="text-sm font-semibold text-zinc-100 mt-0.5">
              Log Debt Payment
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
          <div className="py-3.5 px-4 rounded-xl bg-zinc-950/70 border border-white/[0.06]">
            <label
              htmlFor="paymentAmount"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
            >
              Payment Amount
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-emerald-400 select-none">
                $
              </span>
              <input
                type="number"
                id="paymentAmount"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtPaymentModal;
