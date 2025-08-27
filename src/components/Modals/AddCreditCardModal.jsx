import { useState } from "react";
import dashboardService from "../../services/dashboardService";

const AddCreditCardModal = ({ isOpen, onClose, refreshData }) => {
  const [name, setName] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [statementBalance, setStatementBalance] = useState("");
  const [dueDate, setDueDate] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !creditLimit) return;

    // Convert string inputs to numbers and handle empty optional fields
    const payload = {
      name,
      credit_limit: parseFloat(creditLimit),
      statement_balance: statementBalance ? parseFloat(statementBalance) : 0.0,
      due_date: dueDate || null,
    };

    await dashboardService.addCreditCard(payload);
    onClose();
    refreshData();
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
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="statementBalance"
              className="block text-sm font-medium text-gray-300"
            >
              Current Balance (Optional)
            </label>
            <input
              type="number"
              id="statementBalance"
              value={statementBalance}
              onChange={(e) => setStatementBalance(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              step="0.01"
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
              onClick={onClose}
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
