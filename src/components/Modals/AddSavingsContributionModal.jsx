import { useState } from "react";
import dashboardService from "../../services/dashboardService";

const AddSavingsContributionModal = ({
  isOpen,
  onClose,
  refreshData,
  goalId,
}) => {
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!goalId || !amount) return;

    try {
      await dashboardService.contributeToSavingsGoal(goalId, {
        amount: amount,
      });
      onClose();
      refreshData();
    } catch (error) {
      console.error("Error logging savings contribution:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">Add Contribution</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="contributionAmount"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Contribution Amount
            </label>
            <input
              type="number"
              id="contributionAmount"
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
              Save Contribution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSavingsContributionModal;
