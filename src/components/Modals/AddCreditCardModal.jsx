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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">Add Credit Card</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="cardName"
              className="block text-sm font-medium text-gray-300"
            >
              Card Name
            </label>
            <input
              type="text"
              id="cardName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="creditLimit"
              className="block text-sm font-medium text-gray-300"
            >
              Credit Limit
            </label>
            <input
              type="number"
              id="creditLimit"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
              step="0.01"
              placeholder="e.g., 5000"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="currentBalance"
              className="block text-sm font-medium text-gray-300"
            >
              Current Balance (Optional)
            </label>
            <input
              type="number"
              id="currentBalance"
              value={currentBalance}
              onChange={(e) => setCurrentBalance(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              step="0.01"
              placeholder="e.g., 250.50"
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="dueDate"
              className="block text-sm font-medium text-gray-300"
            >
              Due Date (Optional)
            </label>
            <input
              type="date"
              id="dueDate"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
            />
          </div>
          <div className="flex justify-end space-x-4 mt-6">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-md text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
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
