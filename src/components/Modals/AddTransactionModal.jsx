import { useState, useEffect } from "react";
import dashboardService from "../../services/dashboardService";

const AddTransactionModal = ({
  isOpen,
  onClose,
  refreshData,
  existingTransaction,
}) => {
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Other");
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [recurrence, setRecurrence] = useState("none");
  const isEditing = !!existingTransaction;

  const categories = [
    "Essentials",
    "Subscription",
    "Debt",
    "Food & Drink",
    "Transportation",
    "Entertainment",
    "Shopping",
    "Other",
  ];

  useEffect(() => {
    if (isOpen) {
      if (isEditing) {
        setName(existingTransaction.name);
        setAmount(existingTransaction.amount);
        setCategory(existingTransaction.category || "Other");
        setDueDate(
          existingTransaction.due_date || new Date().toISOString().slice(0, 10)
        );
        setRecurrence(existingTransaction.recurrence || "none");
        setType("expense");
      } else {
        setName("");
        setAmount("");
        setCategory("Other");
        setDueDate(new Date().toISOString().slice(0, 10));
        setPaymentDate(new Date().toISOString().slice(0, 10));
        setRecurrence("none");
        setType("expense");
      }
    }
  }, [existingTransaction, isOpen]);

  const handleSuggestCategory = async () => {
    if (!name) return;
    setIsSuggesting(true);
    try {
      const response = await dashboardService.categorizeExpense(name);
      setCategory(response.category);
    } catch (error) {
      console.error("Error suggesting category:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const isExpense = type === "expense";

    const payload = isExpense
      ? {
          id: existingTransaction?.id,
          name,
          amount,
          due_date: dueDate,
          category,
          recurrence,
        }
      : {
          id: existingTransaction?.id,
          name,
          amount,
          payment_date: paymentDate,
        };

    await dashboardService.saveTransaction(payload, isEditing);

    onClose();
    refreshData();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-sm">
        <h2 className="text-xl font-bold mb-4 text-white">
          {isEditing ? "Edit Transaction" : "Add Transaction"}
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Form fields remain the same */}
          <div className="mb-4">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-300"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          <div className="mb-4">
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-300"
            >
              Amount
            </label>
            <input
              type="number"
              id="amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
              required
            />
          </div>
          {type === "expense" ? (
            <>
              <div className="mb-4">
                <label
                  htmlFor="dueDate"
                  className="block text-sm font-medium text-gray-300"
                >
                  Due Date
                </label>
                <input
                  type="date"
                  id="dueDate"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
                  required
                />
              </div>
              <div className="mb-4">
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-300"
                  >
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={handleSuggestCategory}
                    disabled={isSuggesting || !name}
                    className="text-xs text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                  >
                    {isSuggesting ? "Suggesting..." : "✨ Suggest Category"}
                  </button>
                </div>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label
                  htmlFor="recurrence"
                  className="block text-sm font-medium text-gray-300"
                >
                  Recurring
                </label>
                <select
                  id="recurrence"
                  value={recurrence}
                  onChange={(e) => setRecurrence(e.target.value)}
                  className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
                >
                  <option value="none">No</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </>
          ) : (
            <div className="mb-4">
              <label
                htmlFor="paymentDate"
                className="block text-sm font-medium text-gray-300"
              >
                Payment Date
              </label>
              <input
                type="date"
                id="paymentDate"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
                required
              />
            </div>
          )}
          {!isEditing && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300">
                Type
              </label>
              <div className="mt-2 flex rounded-md shadow-sm">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`px-4 py-2 rounded-l-md w-1/2 ${
                    type === "expense"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`px-4 py-2 rounded-r-md w-1/2 ${
                    type === "income"
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-gray-300"
                  }`}
                >
                  Income
                </button>
              </div>
            </div>
          )}
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
