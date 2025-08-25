import React from "react";

// Component now accepts onEdit and onDelete props
const UpcomingBills = ({ bills, onMarkAsPaid, onEdit, onDelete }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        UPCOMING BILLS
      </h2>
      {bills.length > 0 ? (
        <ul className="space-y-3">
          {bills.map((bill) => (
            <li
              key={bill.id}
              className="flex items-center justify-between group"
            >
              <div className="flex items-center">
                <input
                  type="checkbox"
                  onChange={() => onMarkAsPaid(bill.id)}
                  className="mr-3 h-4 w-4 rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-600"
                />
                <div>
                  <span>{bill.name}</span>
                  <p className="text-xs text-gray-500">
                    {new Date(bill.due_date).toLocaleDateString("en-US", {
                      timeZone: "UTC",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <span className="font-semibold mr-4">
                  ${parseFloat(bill.amount).toFixed(2)}
                </span>
                {/* Edit and Delete icons appear on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                  <button onClick={() => onEdit(bill)} title="Edit">
                    ✏️
                  </button>
                  <button onClick={() => onDelete(bill.id)} title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            </li>
          ))}
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
