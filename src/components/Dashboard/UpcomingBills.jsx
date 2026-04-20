import React, { useState } from "react";

const UpcomingBills = ({ bills, onMarkAsPaid, onEdit, onDelete }) => {
  const [paying, setPaying] = useState(new Set());

  const handleCheck = (billId) => {
    setPaying((prev) => new Set([...prev, billId]));
    // Small delay so the strikethrough is visible before the list re-renders
    setTimeout(() => onMarkAsPaid(billId), 600);
  };

  return (
    <div className="glass-panel p-6">
      <h2 className="text-sm tracking-widest font-bold text-gray-400/80 mb-4 uppercase">
        Upcoming Bills
      </h2>
      {bills.length > 0 ? (
        <ul className="space-y-3">
          {bills.map((bill) => {
            const isPaying = paying.has(bill.id);
            return (
              <li
                key={bill.id}
                className={`glass-card p-3 flex items-center justify-between group transition-all duration-300 ${
                  isPaying ? "opacity-40 scale-[0.98]" : "opacity-100"
                }`}
              >
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPaying}
                    onChange={() => handleCheck(bill.id)}
                    className="mr-3 h-5 w-5 rounded border-white/20 bg-black/20 text-emerald-500 focus:ring-emerald-500/50 cursor-pointer accent-emerald-500 transition-colors"
                  />
                  <div>
                    <span className={`font-medium ${isPaying ? "line-through text-gray-500" : "text-gray-200"}`}>
                      {bill.name}
                    </span>
                    <p className="text-xs text-gray-400 font-medium">
                      {new Date(bill.due_date).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                        month: "short",
                        day: "numeric"
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className={`font-bold mr-4 ${isPaying ? "line-through text-gray-500" : "text-rose-300"}`}>
                    ${parseFloat(bill.amount).toFixed(2)}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                    <button onClick={() => onEdit(bill)} title="Edit" className="hover:scale-110 transition-transform">✏️</button>
                    <button onClick={() => onDelete(bill.id)} title="Delete" className="hover:scale-110 transition-transform">🗑️</button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-gray-400 font-medium text-sm text-center py-4">
          ✨ You're all caught up! No upcoming bills.
        </p>
      )}
    </div>
  );
};

export default UpcomingBills;

