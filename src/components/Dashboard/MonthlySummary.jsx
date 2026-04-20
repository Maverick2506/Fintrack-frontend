import React from "react";

const MonthlySummary = ({ summary }) => {
  const netBalance = summary.previousMonthNetFlow + summary.netFlow;
  return (
    <div className="glass-panel p-6">
      <h2 className="text-sm tracking-widest font-bold text-gray-400/80 mb-6 uppercase">This Month</h2>
      <div className="flex justify-between items-center mb-6">
        <div>
          <p className="text-xs font-semibold text-gray-400 mb-1">Income</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-emerald-200 bg-clip-text text-transparent">
            ${summary.totalIncome.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold text-gray-400 mb-1">Spent</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-rose-200 bg-clip-text text-transparent">
            ${summary.totalSpending.toFixed(2)}
          </p>
        </div>
      </div>
      
      <div className="pt-4 border-t border-white/10 mt-2">
        <p className="text-xs font-semibold text-gray-400 mb-2">Net Cash Flow</p>
        <p className={`text-4xl font-extrabold ${netBalance >= 0 ? "text-white" : "text-rose-400"} text-glow drop-shadow-2xl`}>
          {netBalance >= 0 ? "" : "-"}${Math.abs(netBalance).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default MonthlySummary;
