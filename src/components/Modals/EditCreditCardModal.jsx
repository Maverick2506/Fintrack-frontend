import { useState, useEffect } from "react";
import dashboardService from "../../services/dashboardService";

const EditCreditCardModal = ({ isOpen, onClose, refreshData, card }) => {
  const [name, setName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (card) {
      setName(card.name);
      setCreditLimit(card.creditLimit);
      setDueDate(
        card.dueDate ? new Date(card.dueDate).toISOString().slice(0, 10) : ""
      );
    }
  }, [card]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !creditLimit) return;

    await dashboardService.updateCreditCard(card.id, {
      name,
      creditLimit,
      dueDate: dueDate || null,
    });
    onClose();
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">Edit Credit Card</h2>
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
              step="0.01"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="minimal-input tabular-nums"
              required
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
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCreditCardModal;
