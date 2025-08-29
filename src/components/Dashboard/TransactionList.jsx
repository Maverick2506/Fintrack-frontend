import React from "react";

// Component now accepts onSort and sortConfig props
const TransactionList = ({ transactions, onDelete, onSort, sortConfig }) => {
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return "↕️";
    return sortConfig.direction === "ASC" ? "🔼" : "🔽";
  };

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

      {/* --- NEW Sorting Header --- */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-2 px-2">
        <button
          onClick={() => onSort("name")}
          className="flex-1 text-left font-semibold"
        >
          Name {getSortIndicator("name")}
        </button>
        <button
          onClick={() => onSort("due_date")}
          className="w-24 text-left font-semibold"
        >
          Date {getSortIndicator("due_date")}
        </button>
        <button
          onClick={() => onSort("amount")}
          className="w-24 text-right font-semibold"
        >
          Amount {getSortIndicator("amount")}
        </button>
        <div className="w-10"></div> {/* Spacer for delete button */}
      </div>
      {/* --- END Sorting Header --- */}

      <ul className="space-y-3">
        {transactions.map((transaction) => (
          <li
            key={transaction.id}
            className="flex items-center justify-between group p-2 rounded-md hover:bg-gray-700"
          >
            <div className="flex-1 flex items-center">
              <div>
                <span className="text-white">{transaction.name}</span>
                <p className="text-xs text-gray-500">{transaction.category}</p>
              </div>
            </div>
            <div className="w-24 text-left text-sm text-gray-300">
              {new Date(transaction.due_date).toLocaleDateString("en-US", {
                timeZone: "UTC",
              })}
            </div>
            <div className="w-24 text-right">
              <span className="font-semibold text-red-400">
                -${parseFloat(transaction.amount).toFixed(2)}
              </span>
            </div>
            <div className="w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onDelete(transaction.id)} title="Delete">
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TransactionList;
