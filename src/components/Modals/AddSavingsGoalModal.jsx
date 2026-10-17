import { useState } from "react";
import dashboardService from "../../services/dashboardService";

const AddSavingsGoalModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !goalAmount) return;

    await dashboardService.addSavingsGoal({
      name,
      goal_amount: goalAmount,
    });
    onClose();
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-sm shadow-2xl">
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">New Savings Goal</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="goalName"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Goal Name
            </label>
            <input
              type="text"
              id="goalName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="minimal-input"
              placeholder="e.g., Emergency Fund"
              required
            />
          </div>
          <div>
            <label
              htmlFor="goalAmount"
              className="block text-xs font-medium text-zinc-400 mb-1.5"
            >
              Target Amount
            </label>
            <input
              type="number"
              id="goalAmount"
              step="0.01"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
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
              Create Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSavingsGoalModal;
