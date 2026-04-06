import React, { useState } from "react";

const UpcomingBills = ({ bills, onMarkAsPaid, onEdit, onDelete }) => {
  const [paying, setPaying] = useState(new Set());

  const handleCheck = (billId) => {
    setPaying((prev) => new Set([...prev, billId]));
    // Small delay so the strikethrough is visible before the list re-renders
    setTimeout(() => onMarkAsPaid(billId), 600);
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        UPCOMING BILLS
      </h2>
      {bills.length > 0 ? (
        <ul className="space-y-3">
          {bills.map((bill) => {
            const isPaying = paying.has(bill.id);
            return (
              <li
                key={bill.id}
                className={`flex items-center justify-between group transition-all duration-300 ${
                  isPaying ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPaying}
                    onChange={() => handleCheck(bill.id)}
                    className="mr-3 h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600 cursor-pointer"
                  />
                  <div>
                    <span className={isPaying ? "line-through text-gray-500" : ""}>
                      {bill.name}
                    </span>
                    <p className="text-xs text-gray-400">
                      {new Date(bill.due_date).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`font-semibold mr-4 ${isPaying ? "line-through text-gray-500" : ""}`}>
                    ${parseFloat(bill.amount).toFixed(2)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => onEdit(bill)} title="Edit">✏️</button>
                    <button onClick={() => onDelete(bill.id)} title="Delete">🗑️</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-400 text-sm">
          No upcoming bills. You're all caught up!
        </p>
      )}
    </div>
  );
};

export default UpcomingBills;

