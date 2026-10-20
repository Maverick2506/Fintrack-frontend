import { useState, useEffect } from "react";
import { X, PiggyBank, Calendar, AlertCircle } from "lucide-react";
import dashboardService from "../../services/dashboardService";

const AddSavingsGoalModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name || !goalAmount) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await dashboardService.addSavingsGoal({
        name,
        goal_amount: goalAmount,
        current_amount: currentAmount || 0,
        target_date: targetDate || null,
      });
      setName("");
      setGoalAmount("");
      setCurrentAmount("");
      setTargetDate("");
      onClose();
      refreshData();
    } catch (err) {
      console.error("Failed to add savings goal:", err);
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-savings-goal-title"
        className="bg-zinc-900 border border-white/[0.09] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Reserve
            </p>
            <h2 id="add-savings-goal-title" className="text-sm font-semibold text-zinc-100 mt-0.5">
              New Savings Goal
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
              htmlFor="goalAmount"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
            >
              Target Amount
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-emerald-400 select-none">
                $
              </span>
              <input
                type="number"
                id="goalAmount"
                step="0.01"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
              <PiggyBank size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                id="goalName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                placeholder="Goal name (e.g., Emergency Fund, Japan Trip)"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
              <label
                htmlFor="currentAmount"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Starting Balance
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-zinc-500">$</span>
                <input
                  type="number"
                  id="currentAmount"
                  step="0.01"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-xs font-medium text-zinc-200 placeholder-zinc-600 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
              <label
                htmlFor="targetDate"
                className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1"
              >
                <Calendar size={11} /> Target Date
              </label>
              <input
                type="date"
                id="targetDate"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-zinc-200 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? "Creating..." : "Create Goal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSavingsGoalModal;
