import React from "react";

const MonthlySummary = ({ summary }) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-2">THIS MONTH</h2>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xs text-gray-400">Income</p>
          <p className="text-lg font-bold text-green-400">
            ${summary.totalIncome.toFixed(2)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Spent</p>
          <p className="text-lg font-bold text-red-400">
            ${summary.totalSpending.toFixed(2)}
          </p>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-400">Net Balance</p>
        <p className="text-3xl font-bold text-white">
          ${summary.netFlow.toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default MonthlySummary;
