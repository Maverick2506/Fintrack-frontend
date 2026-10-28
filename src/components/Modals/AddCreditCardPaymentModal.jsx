import { formatCurrency } from "../../utils/formatUtils";
import { useState, useEffect } from "react";
import { X, CreditCard, CheckCircle2, AlertCircle } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { defaultFundChecks, fundBillsPayload, fundsTotal } from "../../utils/planningAlerts";
import FundBillsChecklist from "./FundBillsChecklist";

const AddCreditCardPaymentModal = ({
  isOpen,
  onClose,
  refreshData,
  cardId,
  card,
}) => {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // "Use $X from <fund>": bills on this card that savings goals save for, checked by default
  const fundBills = card?.fundBills || [];
  const [fundChecks, setFundChecks] = useState(() => defaultFundChecks(fundBills));

  useEffect(() => {
    if (!isOpen) return;
    setAmount("");
    setError(null);
    setIsSubmitting(false);
    setFundChecks(defaultFundChecks(card?.fundBills));

    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, card?.fundBills]);

  const effectiveCardId = cardId || card?.id;
  const cardName = card?.name || "Credit Card";
  const currentBalance = parseFloat(
    card?.currentBalance ?? card?.initialBalance ?? 0
  );
  const creditLimit = parseFloat(card?.creditLimit || 0);
  const minPayment = parseFloat(card?.minimumPayment || 0);

  const numAmount = parseFloat(amount) || 0;
  const newBalance = Math.max(0, currentBalance - numAmount);
  const isOverpaying = currentBalance > 0 && numAmount > currentBalance;
  const isFullyPaid = currentBalance > 0 && numAmount >= currentBalance;
  const fromFunds = fundsTotal(fundBills, fundChecks, numAmount);
  const toggleFund = (billId) =>
    setFundChecks((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!effectiveCardId || !numAmount) return;

    if (isOverpaying) {
      setError(
        `Payment cannot exceed current card balance of $${currentBalance.toFixed(
          2
        )}.`
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await dashboardService.payCreditCard(effectiveCardId, {
        amount: numAmount,
        ...(fundBills.length > 0 ? { fundBills: fundBillsPayload(fundBills, fundChecks, numAmount) } : {}),
      });
      setAmount("");
      onClose();
      refreshData();
    } catch (err) {
      console.error("Error logging credit card payment:", err);
      const errMsg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to log credit card payment.";
      setError(errMsg);
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
        className="bg-zinc-900 border border-white/[0.09] rounded-2xl w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <CreditCard size={15} />
            </div>
            <div>
              <p className="text-[10px] font-medium text-amber-400/90 uppercase tracking-wider">
                Card Payment
              </p>
              <h2 className="text-sm font-semibold text-zinc-100">
                {cardName}
              </h2>
            </div>
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

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Current Balance Overview Card */}
          <div className="bg-zinc-950/70 border border-white/[0.06] rounded-xl p-3.5 space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] font-medium text-zinc-400">
                Current Balance
              </span>
              <div className="text-right">
                <span className="text-base font-semibold text-zinc-100 tabular-nums">
                  $
                  {currentBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
                {creditLimit > 0 && (
                  <span className="text-[11px] text-zinc-500 ml-1.5 tabular-nums">
                    / $
                    {creditLimit.toLocaleString("en-US", {
                      minimumFractionDigits: 0,
                    })}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Fill Action Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/[0.04]">
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(currentBalance.toFixed(2));
                    setError(null);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 transition-colors font-medium cursor-pointer"
                >
                  Pay Full ({formatCurrency(currentBalance)})
                </button>
              )}
              {minPayment > 0 && minPayment < currentBalance && (
                <button
                  type="button"
                  onClick={() => {
                    setAmount(minPayment.toFixed(2));
                    setError(null);
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] text-zinc-300 border border-white/10 transition-colors font-medium cursor-pointer"
                >
                  Pay Minimum ({formatCurrency(minPayment)})
                </button>
              )}
            </div>
          </div>

          {/* Payment Amount Input */}
          <div className="py-3 px-4 rounded-xl bg-zinc-950/70 border border-white/[0.06]">
            <label
              htmlFor="paymentAmount"
              className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-1"
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
                min="0.01"
                max={currentBalance > 0 ? currentBalance : undefined}
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError(null);
                }}
                className="w-full bg-transparent text-2xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                placeholder="0.00"
                required
                autoFocus
              />
            </div>
          </div>

          {/* Dynamic Remaining Balance Preview */}
          {numAmount > 0 && (
            <div
              className={`p-3 rounded-xl border transition-all ${
                isOverpaying
                  ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                  : isFullyPaid
                  ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
                  : "bg-indigo-500/10 border-indigo-500/25 text-indigo-300"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="flex items-center gap-1.5">
                  {isFullyPaid && !isOverpaying ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-400" />
                      <span>🎉 Balance Cleared to $0!</span>
                    </>
                  ) : isOverpaying ? (
                    <>
                      <AlertCircle size={13} className="text-rose-400" />
                      <span>Exceeds Current Balance</span>
                    </>
                  ) : (
                    <span>Remaining Card Balance</span>
                  )}
                </span>
                <span className="text-sm font-semibold tabular-nums">
                  $
                  {newBalance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>

              {isOverpaying ? (
                <p className="text-[11px] text-rose-400/90 mt-1">
                  Maximum payment allowed is {formatCurrency(currentBalance)}.
                </p>
              ) : creditLimit > 0 ? (
                <div className="mt-2 space-y-1">
                  <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        newBalance / creditLimit > 0.5
                          ? "bg-rose-400"
                          : newBalance / creditLimit > 0.3
                          ? "bg-amber-400"
                          : "bg-emerald-400"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (newBalance / creditLimit) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-zinc-400 tabular-nums">
                    <span>
                      {formatCurrency(creditLimit - newBalance)} available credit
                    </span>
                    <span>
                      {((newBalance / creditLimit) * 100).toFixed(0)}%
                      utilization
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {fundBills.some((fb) => fb.use > 0) && (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                Paid from savings
              </p>
              <FundBillsChecklist fundBills={fundBills} checked={fundChecks} onToggle={toggleFund} amount={numAmount} />
              {fromFunds > 0 && (
                <p className="text-[11px] text-zinc-500">
                  {formatCurrency(fromFunds)} moves from savings to Checking with this payment.
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-xs text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverpaying || numAmount <= 0}
              className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting
                ? "Saving..."
                : isFullyPaid
                ? `Clear Card (${formatCurrency(numAmount)})`
                : numAmount > 0
                ? `Save Payment (${formatCurrency(numAmount)})`
                : "Save Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditCardPaymentModal;
