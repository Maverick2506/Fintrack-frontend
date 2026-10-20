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

      <div className="flex items-center justify-between text-[11px] font-medium text-zinc-500 uppercase tracking-wider pb-2.5 border-b border-white/[0.06]">
        <button
          onClick={() => onSort("name")}
          className="flex-1 text-left hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Name {getSortIcon("name")}
        </button>
        <button
          onClick={() => onSort("due_date")}
          className="hidden sm:block w-28 text-left hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Date {getSortIcon("due_date")}
        </button>
        <button
          onClick={() => onSort("amount")}
          className="w-24 text-right hover:text-zinc-300 transition-colors cursor-pointer"
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
          return (
            <li
              key={transaction.id}
              className="flex items-center justify-between gap-2 group py-3 hover:bg-white/[0.02] px-1 rounded-lg transition-colors"
            >
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-zinc-200 block truncate">
                  {transaction.name}
                </span>
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
                <span className="text-sm font-medium text-zinc-200">
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
