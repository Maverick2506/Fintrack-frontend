import { useEffect, useState } from "react";
import { PiggyBank, X } from "lucide-react";
import { formatCurrency } from "../../utils/formatUtils";
import { defaultFundChecks, fundBillsPayload, fundsTotal } from "../../utils/planningAlerts";
import FundBillsChecklist from "./FundBillsChecklist";

// Marking a scheduled card payment paid: the bills on the card that savings goals save for are paid
// from them ("Use $X from <fund>", checked by default). Each fund moves its share to Checking.
const CardFundsDialog = ({ bill, fundBills, onConfirm, onCancel }) => {
  const [checked, setChecked] = useState(() => defaultFundChecks(fundBills));
  const amount = Math.abs(parseFloat(bill.amount) || 0);
  const name = bill.name || bill.title;
  const fromFunds = fundsTotal(fundBills, checked);
  const fromChecking = Math.max(0, Math.round((amount - fromFunds) * 100) / 100);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const toggle = (billId) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-funds-title"
        className="bg-zinc-900 border border-white/[0.09] p-5 rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <PiggyBank size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="card-funds-title" className="text-sm font-semibold text-zinc-100">
                Mark card payment paid?
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

        <FundBillsChecklist fundBills={fundBills} checked={checked} onToggle={toggle} />
        <p className="text-[11px] text-zinc-500 mt-3">
          {fromFunds > 0
            ? `Savings move ${formatCurrency(fromFunds)} to Checking, so Checking pays ${formatCurrency(fromChecking)} net.`
            : `Checking pays all ${formatCurrency(amount)}.`}
        </p>

        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="btn-secondary min-h-10">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm({ fundBills: fundBillsPayload(fundBills, checked) })}
            className="btn-primary min-h-10"
          >
            Mark paid
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardFundsDialog;
