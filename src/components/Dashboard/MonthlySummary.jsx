import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

const MonthlySummary = ({ summary }) => {
  const netBalance = summary.previousMonthNetFlow + summary.netFlow;
  const isPositive = netBalance >= 0;

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Monthly Cash Flow
          </h2>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            This month + last month rollover
          </p>
        </div>
        <span
          className="text-[10px] font-medium text-zinc-400 bg-zinc-800/80 border border-white/[0.06] rounded-md px-2 py-0.5"
          title="Net cash flow of the current month plus last month's final net flow"
        >
          This + Last Month
        </span>
      </div>

      <div className="mb-6">
        <p
          className="text-xs font-medium text-zinc-500 mb-1"
          title="Current month net flow plus previous month net flow"
        >
          Net Balance (2-Month Flow)
        </p>
        <p
          className={`text-3xl font-semibold tracking-tight tabular-nums ${
            isPositive ? "text-zinc-100" : "text-rose-400"
          }`}
        >
          {isPositive ? "" : "-"}${Math.abs(netBalance).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/[0.06]">
        <div className="glass-card p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1">
            <ArrowUpRight size={14} className="text-emerald-400" />
            <span>Income</span>
          </div>
          <p className="text-lg font-semibold text-emerald-400 tabular-nums">
            +${summary.totalIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>

        <div className="glass-card p-3.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 mb-1">
            <ArrowDownRight size={14} className="text-rose-400" />
            <span>Spent</span>
          </div>
          <p className="text-lg font-semibold text-rose-400 tabular-nums">
            -${summary.totalSpending.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>
    </div>
  );
};

export default MonthlySummary;
