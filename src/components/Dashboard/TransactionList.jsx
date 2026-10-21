import React from "react";
import { formatCurrency } from "../../utils/formatUtils";
import { Trash2, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

const TransactionList = ({ transactions, onDelete, onSort, sortConfig }) => {
  const getSortIcon = (key) => {
    if (sortConfig.key !== key)
      return <ArrowUpDown size={12} className="text-zinc-600 inline ml-1" />;
    return sortConfig.direction === "ASC" ? (
      <ArrowUp size={12} className="text-zinc-200 inline ml-1" />
    ) : (
      <ArrowDown size={12} className="text-zinc-200 inline ml-1" />
    );
  };

  if (!transactions || transactions.length === 0) {
    return (
      <div className="glass-panel p-6">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Monthly Expenses
        </h2>
        <div className="py-8 rounded-xl border border-dashed border-white/[0.06] text-center">
          <p className="text-zinc-500 text-xs font-medium">
            No expenses recorded for this month.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Monthly Expenses
        </h2>
        <span className="text-xs text-zinc-500 tabular-nums">
          {transactions.length} items
        </span>
      </div>

      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider pb-1 border-b border-white/[0.06]">
        <button
          onClick={() => onSort("name")}
          className="flex-1 text-left hover:text-zinc-300 transition-colors cursor-pointer py-2"
        >
          Name {getSortIcon("name")}
        </button>
        <button
          onClick={() => onSort("due_date")}
          className="hidden sm:block w-28 text-left hover:text-zinc-300 transition-colors cursor-pointer py-2"
        >
          Date {getSortIcon("due_date")}
        </button>
        <button
          onClick={() => onSort("amount")}
          className="w-24 text-right hover:text-zinc-300 transition-colors cursor-pointer py-2"
        >
          Amount {getSortIcon("amount")}
        </button>
        <div className="w-8"></div>
      </div>

      <ul className="divide-y divide-white/[0.05]">
        {transactions.map((transaction) => {
          const formattedDate = new Date(
            transaction.due_date
          ).toLocaleDateString("en-US", {
            timeZone: "UTC",
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          const isUpcoming = transaction.is_paid === false;
          return (
            <li
              key={transaction.id}
              className={`flex items-center justify-between gap-2 group py-3 hover:bg-white/[0.02] px-1 rounded-lg transition-colors ${
                isUpcoming ? "opacity-75" : ""
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium block truncate ${
                      isUpcoming ? "text-zinc-400" : "text-zinc-200"
                    }`}
                  >
                    {transaction.name}
                  </span>
                  {isUpcoming && (
                    <span
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap shrink-0"
                      title="Upcoming / not yet cleared"
                    >
                      Upcoming
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {transaction.category}
                  <span className="sm:hidden tabular-nums">
                    {" "}
                    · {formattedDate}
                  </span>
                </span>
              </div>
              <div className="hidden sm:block w-28 text-left text-xs text-zinc-400 tabular-nums">
                {formattedDate}
              </div>
              <div className="w-24 text-right tabular-nums shrink-0">
                <span
                  className={`text-sm font-medium ${
                    isUpcoming ? "text-zinc-400" : "text-zinc-200"
                  }`}
                >
                  -{formatCurrency(Math.abs(parseFloat(transaction.amount) || 0))}
                </span>
              </div>
              <div className="w-8 text-right opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                <button
                  onClick={() => onDelete(transaction.id)}
                  title="Delete"
                  className="btn-ghost-icon hover:text-rose-400"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default TransactionList;
