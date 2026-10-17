import React, { useState } from "react";
import { Pencil, Trash2, CheckCircle2 } from "lucide-react";

const UpcomingBills = ({ bills, onMarkAsPaid, onEdit, onDelete }) => {
  const [paying, setPaying] = useState(new Set());

  const handleCheck = (billId) => {
    setPaying((prev) => new Set([...prev, billId]));
    setTimeout(() => onMarkAsPaid(billId), 500);
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Upcoming Bills
        </h2>
        <span className="text-xs font-medium text-zinc-500 tabular-nums">
          {bills.length} due
        </span>
      </div>

      {bills.length > 0 ? (
        <ul className="divide-y divide-white/[0.05]">
          {bills.map((bill) => {
            const isPaying = paying.has(bill.id);
            return (
              <li
                key={bill.id}
                className={`py-3 flex items-center justify-between group transition-opacity duration-200 ${
                  isPaying ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isPaying}
                    onChange={() => handleCheck(bill.id)}
                    className="h-4 w-4 rounded border-white/20 bg-zinc-900 text-zinc-100 focus:ring-0 cursor-pointer accent-emerald-400"
                  />
                  <div>
                    <span
                      className={`text-sm font-medium block ${
                        isPaying ? "line-through text-zinc-500" : "text-zinc-200"
                      }`}
                    >
                      {bill.title}
                    </span>
                    <span className="text-xs text-zinc-500 tabular-nums">
                      {new Date(bill.date).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-medium tabular-nums ${
                      isPaying ? "line-through text-zinc-500" : "text-zinc-200"
                    }`}
                  >
                    ${parseFloat(bill.amount).toFixed(2)}
                  </span>
                  <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                      onClick={() => onEdit(bill)}
                      title="Edit"
                      className="btn-ghost-icon"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={() => onDelete(bill.id)}
                      title="Delete"
                      className="btn-ghost-icon hover:text-rose-400"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center border border-dashed border-white/[0.06] rounded-xl">
          <CheckCircle2 size={18} className="text-emerald-400/80 mb-2" />
          <p className="text-zinc-400 text-xs font-medium">
            All caught up — no upcoming bills.
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingBills;

