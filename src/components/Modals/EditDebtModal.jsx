import { useState, useEffect } from "react";
import { X, Calendar, Repeat, Landmark, AlertCircle } from "lucide-react";
import { getTorontoTodayStr } from "../../utils/dateUtils";
import dashboardService from "../../services/dashboardService";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const EditDebtModal = ({ isOpen, onClose, refreshData, debt }) => {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [autoPay, setAutoPay] = useState(false);
  const [nextDueDate, setNextDueDate] = useState(
    getTorontoTodayStr()
  );
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");
  const [totalRemaining, setTotalRemaining] = useState("");
  const [initialTotalRemaining, setInitialTotalRemaining] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (debt) {
      setName(debt.name || "");
      setTotalAmount(debt.total_amount ?? "");
      setMonthlyPayment(debt.monthly_payment ?? "");
      setInterestRate(
        debt.interest_rate ?? debt.interestRate ?? ""
      );
      setAutoPay(Boolean(debt.auto_pay ?? debt.autoPay));
      setNextDueDate(
        debt.next_due_date ||
          debt.dueDate ||
          getTorontoTodayStr()
      );
      setPaymentFrequency(
        debt.payment_frequency || debt.paymentFrequency || "monthly"
      );
      const initRemaining = debt.total_remaining ?? debt.initialBalance ?? "";
      setTotalRemaining(initRemaining);
      setInitialTotalRemaining(initRemaining);
    }
  }, [debt]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const getPaymentLabel = () => {
    if (!autoPay) return "Monthly Payment";
    switch (paymentFrequency) {
      case "weekly":
        return "Weekly Payment";
      case "bi-weekly":
        return "Bi-weekly Payment";
      case "yearly":
        return "Yearly Payment";
      default:
        return "Monthly Payment";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name || !totalAmount || !monthlyPayment) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        name,
        total_amount: totalAmount,
        monthly_payment: monthlyPayment,
        interest_rate: interestRate !== "" ? parseFloat(interestRate) : null,
        auto_pay: autoPay,
        // Turning auto-pay off keeps the existing due date and frequency instead of erasing them (F4)
        next_due_date: autoPay
          ? nextDueDate
          : debt.next_due_date || debt.dueDate || null,
        payment_frequency: autoPay
          ? paymentFrequency
          : debt.payment_frequency || debt.paymentFrequency || "monthly",
      };

      // Only send total_remaining if user explicitly changed it
      if (String(totalRemaining).trim() !== String(initialTotalRemaining).trim()) {
        payload.total_remaining =
          totalRemaining !== "" ? parseFloat(totalRemaining) : undefined;
      }

      await dashboardService.updateDebt(debt.id, payload);
      onClose();
      refreshData();
    } catch (err) {
      console.error("Failed to update debt:", err);
      setError(err?.response?.data?.error || err?.message || "Failed to update debt.");
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
              Liabilities
            </p>
            <h2 className="text-sm font-semibold text-zinc-100 mt-0.5">
              Edit Debt
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
              htmlFor="totalAmountEdit"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
            >
              Original Amount (does not change remaining balance)
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-rose-400 select-none">
                $
              </span>
              <input
                type="number"
                id="totalAmountEdit"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                required
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
              <Landmark size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                id="debtNameEdit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3.5 py-2.5">
              <label
                htmlFor="totalRemainingEdit"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Remaining Balance
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-zinc-500">$</span>
                <input
                  type="number"
                  id="totalRemainingEdit"
                  step="0.01"
                  value={totalRemaining}
                  onChange={(e) => setTotalRemaining(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-sm font-medium text-zinc-100 placeholder-zinc-600 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3.5 py-2.5">
              <label
                htmlFor="monthlyPaymentEdit"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                {getPaymentLabel()}
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-zinc-500">$</span>
                <input
                  type="number"
                  id="monthlyPaymentEdit"
                  step="0.01"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  className="w-full bg-transparent text-sm font-medium text-zinc-100 placeholder-zinc-600 focus:outline-none tabular-nums"
                  required
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3.5 py-2.5">
              <label
                htmlFor="interestRateEdit"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Interest Rate (APR)
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  id="interestRateEdit"
                  step="0.01"
                  min="0"
                  max="100"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-sm font-medium text-zinc-100 placeholder-zinc-600 focus:outline-none tabular-nums"
                />
                <span className="text-xs font-medium text-zinc-500">%</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs text-zinc-300">
                <Repeat size={13} className="text-zinc-500" />
                Enable Auto-Pay Schedule
              </span>
              <button
                type="button"
                onClick={() => setAutoPay((v) => !v)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                  autoPay
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-400 border-white/[0.06]"
                }`}
              >
                {autoPay ? "Active" : "Off"}
              </button>
            </div>

            {autoPay && (
              <div className="pt-2.5 border-t border-white/[0.05] space-y-3">
                <div>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1">
                    <Calendar size={11} /> Next Payment Date
                  </span>
                  <input
                    type="date"
                    value={nextDueDate}
                    onChange={(e) => setNextDueDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none tabular-nums"
                    required
                  />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider block mb-1.5">
                    Payment Frequency
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {FREQUENCIES.map((f) => (
                      <button
                        key={f.value}
                        type="button"
                        onClick={() => setPaymentFrequency(f.value)}
                        className={`py-1.5 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                          paymentFrequency === f.value
                            ? "bg-zinc-100 text-zinc-950"
                            : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
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

export default EditDebtModal;
