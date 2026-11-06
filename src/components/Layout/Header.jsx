import React from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { getTorontoTodayDate } from "../../utils/dateUtils";

const Header = ({
  onAddTransaction,
  selectedDate,
  onPrevMonth,
  onNextMonth,
  onResetMonth,
  isCurrentMonth,
}) => {
  const displayDate = selectedDate || getTorontoTodayDate();
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
              className="group -my-2 min-w-10 min-h-10 -mx-2 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
              title="Previous month"
              aria-label="Previous month"
            >
              <span className="p-1 rounded-md transition-colors group-hover:bg-white/[0.06]">
                <ChevronLeft size={13} />
              </span>
            </button>
            <span className="px-2.5 text-[11px] font-semibold text-zinc-300 uppercase tracking-wider min-w-[110px] text-center">
              {month} {year}
            </span>
            <button
              type="button"
              onClick={onNextMonth}
              className="group -my-2 min-w-10 min-h-10 -mx-2 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-100 cursor-pointer"
              title="Next month"
              aria-label="Next month"
            >
              <span className="p-1 rounded-md transition-colors group-hover:bg-white/[0.06]">
                <ChevronRight size={13} />
              </span>
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
            className="btn-primary w-full sm:w-auto justify-center group"
            title="Shortcut: Press N"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Transaction</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] font-mono font-semibold bg-zinc-950/20 text-zinc-900 rounded border border-zinc-950/20">
              N
            </kbd>
          </button>
        </div>
      )}
    </header>
  );
};

export default Header;
