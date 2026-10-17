import { useState } from "react";
import dashboardService from "../../services/dashboardService";

const AddDebtModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [autoPay, setAutoPay] = useState(false);
  const [nextDueDate, setNextDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentFrequency, setPaymentFrequency] = useState("monthly");

  const getPaymentLabel = () => {
    if (!autoPay) return "Monthly Payment/Estimate";
    switch (paymentFrequency) {
      case "weekly": return "Weekly Payment";
      case "bi-weekly": return "Bi-Weekly Payment";
      case "yearly": return "Yearly Payment";
      default: return "Monthly Payment";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !totalAmount || !monthlyPayment) return;

    await dashboardService.addDebt({
      name,
      total_amount: totalAmount,
      monthly_payment: monthlyPayment,
      auto_pay: autoPay,
      next_due_date: autoPay ? nextDueDate : null,
      payment_frequency: autoPay ? paymentFrequency : "monthly",
    });
    
    // Reset form after submission
    setName("");
    setTotalAmount("");
    setMonthlyPayment("");
    setAutoPay(false);
    setNextDueDate(new Date().toISOString().slice(0, 10));
    setPaymentFrequency("monthly");
    
    onClose();
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">Add New Debt</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="debtName"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Debt Name
            </label>
            <input
              type="text"
              id="debtName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="minimal-input"
              placeholder="e.g., Car Loan"
              required
            />
          </div>
          <div>
            <label
              htmlFor="totalAmount"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Total Amount
            </label>
            <input
              type="number"
              id="totalAmount"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="minimal-input tabular-nums"
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label
              htmlFor="monthlyPayment"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              {getPaymentLabel()}
            </label>
            <input
              type="number"
              id="monthlyPayment"
              step="0.01"
              value={monthlyPayment}
              onChange={(e) => setMonthlyPayment(e.target.value)}
              className="minimal-input tabular-nums"
              placeholder="0.00"
              required
            />
          </div>

          <div className="flex items-center pt-1">
            <input
              type="checkbox"
              id="autoPay"
              checked={autoPay}
              onChange={(e) => setAutoPay(e.target.checked)}
              className="mr-2.5 rounded border-zinc-700 bg-zinc-950 text-zinc-100 focus:ring-0"
            />
            <label htmlFor="autoPay" className="text-xs font-medium text-zinc-300">
              Enable Auto-Pay Schedule
            </label>
          </div>

          {autoPay && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Next Due Date
                </label>
                <input
                  type="date"
                  value={nextDueDate}
                  onChange={(e) => setNextDueDate(e.target.value)}
                  className="minimal-input"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                  Frequency
                </label>
                <select
                  value={paymentFrequency}
                  onChange={(e) => setPaymentFrequency(e.target.value)}
                  className="minimal-input"
                >
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Add Debt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddDebtModal;
