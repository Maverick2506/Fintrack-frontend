import { useState } from "react";
import dashboardService from "../../services/dashboardService";

const AddCreditCardPaymentModal = ({
  isOpen,
  onClose,
  refreshData,
  cardId,
}) => {
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cardId || !amount) return;

    try {
      await dashboardService.payCreditCard(cardId, { amount });
      onClose();
      refreshData();
    } catch (error) {
      console.error("Error logging credit card payment:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">Log Card Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="paymentAmount"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Payment Amount
            </label>
            <input
              type="number"
              id="paymentAmount"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="minimal-input tabular-nums"
              placeholder="0.00"
              required
            />
          </div>
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
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditCardPaymentModal;
