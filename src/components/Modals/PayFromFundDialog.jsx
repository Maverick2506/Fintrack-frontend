import { useEffect, useState } from "react";
import { PiggyBank, X } from "lucide-react";
import { formatCurrency } from "../../utils/formatUtils";
import { payFromFundLabel, payFromFundSplit } from "../../utils/planningAlerts";

// Marking a bill paid that a savings goal saves for: "Pay from <fund> ($X saved)", checked by default.
// The fund pays what it can; the rest comes from Checking (the server works out the amounts).
const PayFromFundDialog = ({ bill, fund, onConfirm, onCancel }) => {
  const [useFund, setUseFund] = useState(true);
  const amount = Math.abs(parseFloat(bill.amount) || 0);
  const name = bill.name || bill.title;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-from-fund-title"
        className="bg-zinc-900 border border-white/[0.09] p-5 rounded-2xl w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <PiggyBank size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="pay-from-fund-title" className="text-sm font-semibold text-zinc-100">
                Mark bill paid?
              </h2>
              <p className="text-xs text-zinc-400 truncate">
                {name} · <span className="tabular-nums">{formatCurrency(amount)}</span>
              </p>
            </div>
          </div>
          <button type="button" onClick={onCancel} className="btn-ghost-icon" aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <label className="flex items-start gap-3 rounded-xl border border-white/[0.08] p-3 min-h-10 cursor-pointer">
          <input
            type="checkbox"
            checked={useFund}
            onChange={(e) => setUseFund(e.target.checked)}
            className="mt-0.5 w-4 h-4 accent-emerald-400 flex-shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-zinc-100">{payFromFundLabel(fund)}</span>
            <span className="block text-[11px] text-zinc-500 mt-0.5">
              {useFund
                ? payFromFundSplit(fund, amount)
                : `Checking pays all ${formatCurrency(amount)}; ${fund.name} keeps its money.`}
            </span>
          </span>
        </label>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="btn-secondary min-h-10">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ payFromGoalId: useFund ? fund.goalId : null })}
            className="btn-primary min-h-10"
          >
            Mark paid
          </button>
        </div>
      </div>
    </div>
  );
};

export default PayFromFundDialog;
