import React from "react";

const TransactionList = ({ transactions, onDelete }) => {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-sm font-semibold text-gray-400 mb-3">
          MONTHLY EXPENSES
        </h2>
        <p className="text-gray-400 text-sm">No expenses for this month.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        MONTHLY EXPENSES
      </h2>
      <ul className="space-y-3">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center">
              <div>
                <span className="text-white">{transaction.name}</span>
                <p className="text-xs text-gray-500">
                  {new Date(transaction.due_date).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="font-semibold text-red-400 mr-4">
                -${parseFloat(transaction.amount).toFixed(2)}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => onDelete(transaction.id)} title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransactionList;
