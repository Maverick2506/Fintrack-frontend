import React from "react";
import { formatCurrency } from "../../utils/formatUtils";

const CategoryDetailModal = ({ isOpen, onClose, category, transactions }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cat-detail-title"
        className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
          <h2 id="cat-detail-title" className="text-base font-semibold tracking-tight text-zinc-100">
            {category}
          </h2>
          <span className="text-xs text-zinc-500">
            {transactions.length} transactions
          </span>
        </div>
        {transactions.length > 0 ? (
          <ul className="divide-y divide-white/[0.05] max-h-80 overflow-y-auto">
            {transactions.map((t) => {
              const isUpcoming = t.is_paid === false;
              return (
                <li
                  key={t.id}
                  className={`flex justify-between items-center py-2.5 ${
                    isUpcoming ? "opacity-75" : ""
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm font-medium ${
                          isUpcoming ? "text-zinc-400" : "text-zinc-200"
                        }`}
                      >
                        {t.name}
                      </span>
                      {isUpcoming && (
                        <span
                          className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap"
                          title="Upcoming / not yet cleared"
                        >
                          Upcoming
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-500">
                      {new Date(t.due_date || t.date).toLocaleDateString("en-US", {
                        timeZone: "UTC",
                      })}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-semibold tabular-nums ${
                      isUpcoming ? "text-rose-400/80" : "text-rose-400"
                    }`}
                  >
                    -{formatCurrency(Math.abs(parseFloat(t.amount) || 0))}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-xs text-zinc-500 py-6 text-center">
            No transactions found for this category.
          </p>
        )}
        <div className="flex justify-end mt-5 pt-3 border-t border-white/[0.06]">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryDetailModal;
