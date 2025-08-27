import React from "react";
import { useNavigate } from "react-router-dom";

const CreditCardSummary = ({ creditCards }) => {
  const navigate = useNavigate();

  // Helper to get a color for the utilization bar based on percentage
  const getBarColor = (percentage) => {
    if (percentage > 70) return "bg-red-500";
    if (percentage > 40) return "bg-yellow-500";
    return "bg-purple-500";
  };

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold text-gray-400">
          CREDIT CARD BALANCES
        </h2>
        <button
          onClick={() => navigate("/credit-cards")}
          className="text-xs text-indigo-400 hover:text-indigo-300"
        >
          View All
        </button>
      </div>
      <div className="space-y-4">
        {creditCards && creditCards.length > 0 ? (
          creditCards.slice(0, 2).map((card) => {
            // Show up to 2 cards on the dashboard
            const utilization =
              parseFloat(card.creditLimit) > 0
                ? (parseFloat(card.currentBalance) /
                    parseFloat(card.creditLimit)) *
                  100
                : 0;
            return (
              <div key={card.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-sm font-medium text-white">
                    {card.name}
                  </span>
                  <span className="text-sm text-gray-300">
                    ${parseFloat(card.currentBalance).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2.5">
                  <div
                    className={`${getBarColor(utilization)} h-2.5 rounded-full`}
                    style={{ width: `${utilization.toFixed(0)}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-gray-400 text-sm">No credit cards added yet.</p>
        )}
      </div>
    </div>
  );
};

export default CreditCardSummary;
