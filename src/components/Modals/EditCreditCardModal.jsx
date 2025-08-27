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
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">Edit Credit Card</h2>
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
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditCreditCardModal;
