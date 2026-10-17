import { useState, useEffect } from "react";
import dashboardService from "../../services/dashboardService";

const EditSavingsGoalModal = ({ isOpen, onClose, refreshData, goal }) => {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setGoalAmount(goal.goal_amount);
    }
  }, [goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !goalAmount) return;

    await dashboardService.updateSavingsGoal(goal.id, {
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
        <h2 className="text-lg font-semibold tracking-tight mb-5 text-zinc-100">Edit Savings Goal</h2>
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSavingsGoalModal;
