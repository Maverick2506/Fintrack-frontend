import { useState } from "react";
import axios from "axios";

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
      await axios.post(
        `http://localhost:8000/api/savings-goals/${goalId}/contribute`,
        {
          amount: amount,
        }
      );
      onClose();
      refreshData();
    } catch (error) {
      console.error("Error logging savings contribution:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">Add Contribution</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="contributionAmount"
              className="block text-sm font-medium text-gray-300"
            >
              Amount
            </label>
            <input
              type="number"
              id="contributionAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
              Save Contribution
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSavingsContributionModal;
