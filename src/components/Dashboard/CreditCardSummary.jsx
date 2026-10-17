import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const CreditCardSummary = ({ creditCards }) => {
  const navigate = useNavigate();

  const getBarColor = (percentage) => {
    if (percentage > 70) return "bg-rose-400";
    if (percentage > 40) return "bg-amber-400";
    return "bg-zinc-200";
  };

  return (
    <div className="glass-panel p-6">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Credit Cards
        </h2>
        <button
          onClick={() => navigate("/credit-cards")}
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-400 hover:text-zinc-100 transition-colors cursor-pointer"
        >
          <span>View all</span>
          <ArrowRight size={12} />
        </button>
      </div>

      <div className="space-y-4">
        {creditCards && creditCards.length > 0 ? (
          creditCards.slice(0, 3).map((card) => {
            const utilization =
              parseFloat(card.creditLimit) > 0
                ? (parseFloat(card.initialBalance) / parseFloat(card.creditLimit)) * 100
                : 0;
            return (
              <div key={card.id}>
                <div className="flex justify-between items-baseline mb-1.5">
                  <span className="text-sm font-medium text-zinc-200">
                    {card.name}
                  </span>
                  <div className="flex items-baseline gap-2 tabular-nums">
                    <span className="text-sm font-semibold text-zinc-100">
                      ${parseFloat(card.initialBalance).toFixed(2)}
                    </span>
                    <span className="text-xs text-zinc-500">
                      ({utilization.toFixed(0)}%)
                    </span>
                  </div>
                </div>
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${getBarColor(utilization)} h-1.5 rounded-full transition-all duration-500`}
                    style={{ width: `${Math.min(100, Math.max(0, utilization)).toFixed(0)}%` }}
                  />
                </div>
              </div>
            );
          })
        ) : (
          <button
            type="button"
            onClick={() => navigate("/credit-cards")}
            className="w-full py-5 rounded-xl border border-dashed border-white/[0.07] hover:border-white/[0.15] hover:bg-white/[0.02] text-center transition-all cursor-pointer group"
          >
            <p className="text-zinc-500 group-hover:text-zinc-300 text-xs font-medium transition-colors">
              No credit cards tracked — click to add one →
            </p>
          </button>
        )}
      </div>
    </div>
  );
};

export default CreditCardSummary;
