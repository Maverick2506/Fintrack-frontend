import React from "react";

const CategoryDetailModal = ({ isOpen, onClose, category, transactions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center p-4 z-50">
      <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 text-white">
          Transactions for: {category}
        </h2>
        {transactions.length > 0 ? (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {transactions.map((t) => (
              <li key={t.id} className="flex justify-between items-center">
                <div>
                  <span className="text-white">{t.name}</span>
                  <p className="text-xs text-gray-500">
                    {new Date(t.due_date).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </p>
                </div>
                <span className="font-semibold text-red-400">
                  -${parseFloat(t.amount).toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-400">
            No transactions found for this category.
          </p>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailModal;
