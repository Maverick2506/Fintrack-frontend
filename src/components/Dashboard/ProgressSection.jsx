import React from "react";

const ProgressSection = ({
  debtSummary,
  savingsSummary,
  onPayDebt,
  onContribute,
}) => {
  // We only show the first debt and savings goal for simplicity on the dashboard
  const primaryDebt = debtSummary[0] || null;
  const primaryGoal = savingsSummary[0] || null; // Changed to index 0 to grab the first goal

  // MODIFIED: Correctly calculate debt paydown progress
  const debtProgress = primaryDebt
    ? ((parseFloat(primaryDebt.total_amount) -
        parseFloat(primaryDebt.total_remaining)) /
        parseFloat(primaryDebt.total_amount)) *
      100
    : 0;

  // Calculate savings progress if primary goal exists
  const savingsProgress = primaryGoal
    ? (parseFloat(primaryGoal.current_amount) /
        parseFloat(primaryGoal.goal_amount)) *
      100
    : 0;

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        YOUR PROGRESS
      </h2>
      <div className="space-y-4">
        {primaryDebt && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold">
                {primaryDebt.name} Paydown
              </span>
              <button
                onClick={() => onPayDebt(primaryDebt.id)}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded"
              >
                Pay
              </button>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${debtProgress.toFixed(0)}%` }}
              ></div>
            </div>
          </div>
        )}
        {primaryGoal && (
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold">{primaryGoal.name}</span>
              <button
                onClick={() => onContribute(primaryGoal.id)}
                className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-2 rounded"
              >
                Contribute
              </button>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
              <div
                className="bg-green-500 h-2.5 rounded-full"
                style={{ width: `${savingsProgress.toFixed(0)}%` }}
              ></div>
            </div>
          </div>
        )}
        {!primaryDebt && !primaryGoal && (
          <p className="text-gray-400 text-sm">
            No active debts or savings goals to track.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProgressSection;
