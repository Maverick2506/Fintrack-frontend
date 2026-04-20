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
    <div className="glass-panel p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-sm tracking-widest font-bold text-gray-400/80 uppercase">
          Credit Cards
        </h2>
        <button
          onClick={() => navigate("/credit-cards")}
          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-wider bg-indigo-500/10 px-3 py-1.5 rounded-full hover:bg-indigo-500/20"
        >
          View All
        </button>
      </div>
      <div className="space-y-5">
        {creditCards && creditCards.length > 0 ? (
          creditCards.slice(0, 2).map((card) => {
            const utilization =
              parseFloat(card.creditLimit) > 0
                ? (parseFloat(card.currentBalance) / parseFloat(card.creditLimit)) * 100
                : 0;
            return (
              <div key={card.id} className="group">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors">
                    {card.name}
                  </span>
                  <span className="text-md font-bold text-white tracking-wide">
                    ${parseFloat(card.currentBalance).toFixed(2)}
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
                  <div
                    className={`${getBarColor(utilization)} h-2.5 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                    style={{ width: `${utilization.toFixed(0)}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 rounded-xl border border-dashed border-white/20 text-center">
            <p className="text-gray-400 text-sm font-medium">No credit cards added yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CreditCardSummary;
