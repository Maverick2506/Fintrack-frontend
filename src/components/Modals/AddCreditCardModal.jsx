import { useState } from "react";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !creditLimit) return;

    // Prepare the payload with the corrected field names
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">Add Credit Card</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="cardName"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Card Name
            </label>
            <input
              type="text"
              id="cardName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="minimal-input"
              placeholder="e.g., Amex Cobalt"
              required
            />
          </div>
          <div>
            <label
              htmlFor="creditLimit"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Credit Limit
            </label>
            <input
              type="number"
              id="creditLimit"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="minimal-input tabular-nums"
              required
              step="0.01"
              placeholder="5000.00"
            />
          </div>
          <div>
            <label
              htmlFor="currentBalance"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Current Balance (Optional)
            </label>
            <input
              type="number"
              id="currentBalance"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              className="minimal-input tabular-nums"
              step="0.01"
              placeholder="0.00"
            />
          </div>
          <div>
            <label
              htmlFor="dueDate"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Statement Due Date (Optional)
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="minimal-input"
            />
          </div>
          <div className="flex justify-end gap-2.5 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Add Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddCreditCardModal;
