import React from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";

const Header = ({
  onAddTransaction,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onResetMonth,
  isCurrentMonth,
}) => {
  const displayDate = selectedDate || new Date();
  const month = displayDate.toLocaleString("default", { month: "long" });
  const year = displayDate.getFullYear();

  return (
    <header className="mb-8 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center bg-zinc-900/90 border border-white/[0.07] rounded-lg p-0.5">
            <button
              type="button"
              onClick={onPrevMonth}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
              title="Previous month"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-2.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider min-w-[110px] text-center">
              {month} {year}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] rounded-md transition-colors cursor-pointer"
              title="Next month"
            >
              <ChevronRight size={13} />
            </button>
          </div>

          {!isCurrentMonth && onResetMonth && (
            <button
              type="button"
              onClick={onResetMonth}
              className="px-2 py-1 text-[11px] font-medium text-zinc-400 hover:text-zinc-100 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-lg transition-colors cursor-pointer"
            >
              Current Month
            </button>
          )}
        </div>

        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-1.5">
          Financial Overview
        </h1>
      </div>

      {onAddTransaction && (
        <div className="flex items-center">
          <button
            onClick={onAddTransaction}
            className="btn-primary group"
            title="Shortcut: Press N"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Transaction</span>
            <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-950/20 text-zinc-900 rounded border border-zinc-950/20">
              N
            </kbd>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
