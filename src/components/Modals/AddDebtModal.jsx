import { useState, useEffect } from "react";
import { X, Calendar, Repeat, Landmark } from "lucide-react";
import dashboardService from "../../services/dashboardService";

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Bi-weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const AddDebtModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [autoPay, setAutoPay] = useState(false);
  const [nextDueDate, setNextDueDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");

  useEffect(() => {
    if (!isOpen) return;
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
    if (!name || !totalAmount || !monthlyPayment) return;

    await dashboardService.addDebt({
      name,
      total_amount: totalAmount,
      monthly_payment: monthlyPayment,
      interest_rate: interestRate !== "" ? parseFloat(interestRate) : null,
      auto_pay: autoPay,
      next_due_date: autoPay ? nextDueDate : null,
      payment_frequency: autoPay ? paymentFrequency : "monthly",
    });

    setName("");
    setTotalAmount("");
    setMonthlyPayment("");
    setInterestRate("");
    setAutoPay(false);
    setNextDueDate(new Date().toISOString().slice(0, 10));
    setPaymentFrequency("monthly");

    onClose();
    refreshData();
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
        aria-labelledby="add-debt-title"
        className="bg-zinc-900 border border-white/[0.09] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Liability
            </p>
            <h2 id="add-debt-title" className="text-sm font-semibold text-zinc-100 mt-0.5">
              Add New Debt
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
          {/* Hero Total Balance */}
          <div className="py-3 px-4 rounded-xl bg-zinc-950/70 border border-white/[0.06]">
            <label
              htmlFor="totalAmount"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
            >
              Total Principal / Balance
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-rose-400 select-none">
                $
              </span>
              <input
                type="number"
                id="totalAmount"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                required
                autoFocus
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
              <Landmark size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                id="debtName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Debt name (e.g., Car Loan, Student Loan)"
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* 2-Column: Payment per period + APR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3.5 py-2.5">
              <label
                htmlFor="monthlyPayment"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                {getPaymentLabel()}
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-zinc-500">$</span>
                <input
                  type="number"
                  id="monthlyPayment"
                  step="0.01"
                  value={monthlyPayment}
                  onChange={(e) => setMonthlyPayment(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-sm font-medium text-zinc-100 placeholder-zinc-600 focus:outline-none tabular-nums"
                  required
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3.5 py-2.5">
              <label
                htmlFor="interestRate"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Interest Rate (APR)
              </label>
              <div className="flex items-baseline gap-1">
                <input
                  type="number"
                  id="interestRate"
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

          {/* Auto-Pay Toggle Card */}
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

          <div className="flex items-center justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Debt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtModal;
