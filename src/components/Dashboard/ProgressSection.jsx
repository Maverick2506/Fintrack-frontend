import React from "react";

const ProgressSection = ({
  debtSummary,
  savingsSummary,
  onPayDebt,
  onContribute,
}) => {
  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        YOUR PROGRESS
      </h2>
      <div className="space-y-4">
        {/* --- All Debts --- */}
        {debtSummary && debtSummary.length > 0 && debtSummary.map((debt) => {
          const progress = parseFloat(debt.total_amount) > 0
            ? ((parseFloat(debt.total_amount) - parseFloat(debt.total_remaining)) / parseFloat(debt.total_amount)) * 100
            : 0;
          return (
            <div key={debt.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-300">{debt.name} Paydown</span>
                <button
                  onClick={() => onPayDebt(debt.id)}
                  className="text-xs bg-orange-600 hover:bg-orange-700 text-white font-bold py-1 px-2 rounded"
                >
                  Pay
                </button>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: progress > 0 ? `max(${progress.toFixed(1)}%, 4px)` : '0%' }}
                />
              </div>
              <p className="text-xs text-gray-600 text-right mt-0.5">{progress.toFixed(0)}% paid</p>
            </div>
          );
        })}

        {/* --- All Savings Goals --- */}
        {savingsSummary && savingsSummary.length > 0 && savingsSummary.map((goal) => {
          const progress = parseFloat(goal.goal_amount) > 0
            ? (parseFloat(goal.current_amount) / parseFloat(goal.goal_amount)) * 100
            : 0;
          return (
            <div key={goal.id}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-semibold text-gray-300">{goal.name}</span>
                <button
                  onClick={() => onContribute(goal.id)}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
                >
                  Contribute
                </button>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                  style={{ width: progress > 0 ? `max(${progress.toFixed(2)}%, 4px)` : '0%' }}
                />
              </div>
              <p className="text-xs text-gray-600 text-right mt-0.5">{progress.toFixed(1)}% complete</p>
            </div>
          );
        })}

        {(!debtSummary || debtSummary.length === 0) && (!savingsSummary || savingsSummary.length === 0) && (
          <p className="text-gray-400 text-sm">
            No active debts or savings goals to track.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProgressSection;
