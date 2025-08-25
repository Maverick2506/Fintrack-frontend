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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">New Savings Goal</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="goalName"
              className="block text-sm font-medium text-gray-300"
            >
              Goal Name
            </label>
            <input
              type="text"
              id="goalName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="goalAmount"
              className="block text-sm font-medium text-gray-300"
            >
              Goal Amount
            </label>
            <input
              type="number"
              id="goalAmount"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Add Goal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSavingsGoalModal;
