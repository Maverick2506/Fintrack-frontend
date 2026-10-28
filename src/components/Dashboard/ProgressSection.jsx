import React, { useState } from "react";
import { Plus } from "lucide-react";
import { formatCurrency } from "../../utils/formatUtils";
import { calculatePacing } from "../../utils/savingsPacing";

const ProgressSection = ({
  debtSummary,
  savingsSummary,
  onPayDebt,
  onContribute,
  onAddDebt,
  onAddSavingsGoal,
}) => {
  const [showAllMobile, setShowAllMobile] = useState(false);
  const activeDebts = (debtSummary || []).filter(
    (d) => (parseFloat(d.initialBalance) || 0) > 0 && d.isActive !== false
  );

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          Goals & Paydowns
        </h2>
        <div className="flex items-center gap-1.5">
          {onAddDebt && (
            <button
              onClick={onAddDebt}
              className="btn-secondary !py-1 !px-2.5 !text-[11px]"
            >
              <Plus size={12} strokeWidth={2} className="text-zinc-400" />
              <span>Debt</span>
            </button>
          )}
          {onAddSavingsGoal && (
            <button
              onClick={onAddSavingsGoal}
              className="btn-secondary !py-1 !px-2.5 !text-[11px]"
            >
              <Plus size={12} strokeWidth={2} className="text-zinc-400" />
              <span>Goal</span>
            </button>
          )}
        </div>
      </div>
      <div className="space-y-5">
        {/* --- Active Debts --- */}
        {activeDebts.length > 0 &&
          activeDebts.map((debt, dIdx) => {
            const originalAmount =
              parseFloat(debt.targetAmount) ||
              parseFloat(debt.initialBalance) ||
              1;
            const currentAmount = parseFloat(debt.initialBalance) || 0;
            const progress =
              ((originalAmount - currentAmount) / originalAmount) * 100;

            return (
              <div key={debt.id} className={!showAllMobile && dIdx >= 3 ? "hidden sm:block" : ""}>
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">
                      {debt.name}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 tabular-nums">
                      {formatCurrency(currentAmount)} left
                    </span>
                  </div>
                  <button
                    onClick={() => onPayDebt(debt.id)}
                    className="btn-secondary !py-1 !px-2.5 !text-[11px]"
                  >
                    Pay
                  </button>
                </div>
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-rose-400 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width:
                        progress > 0 ? `max(${progress.toFixed(1)}%, 4px)` : "0%",
                    }}
                  />
                </div>
                <p className="text-[11px] text-zinc-500 text-right mt-1 tabular-nums">
                  {Math.max(0, progress).toFixed(0)}% paid
                </p>
              </div>
            );
          })}

        {/* --- All Savings Goals --- */}
        {savingsSummary &&
          savingsSummary.length > 0 &&
          savingsSummary.map((goal, gIdx) => {
            const pacing = calculatePacing(goal, "bi-weekly");
            const target = parseFloat(goal.goal_amount ?? goal.targetAmount) || 1;
            const current = parseFloat(goal.initialBalance) || 0;
            const progress = (current / target) * 100;

            return (
              <div key={goal.id} className={!showAllMobile && (activeDebts.length + gIdx) >= 3 ? "hidden sm:block" : ""}>
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-zinc-200">
                        {goal.name}
                      </span>
                      {pacing && (
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-medium border ${pacing.badgeClass}`}
                        >
                          {pacing.label}
                        </span>
                      )}
                    </div>
                    <span className="ml-2 text-xs text-zinc-500 tabular-nums">
                      {formatCurrency(current)} / {formatCurrency(target)}
                    </span>
                  </div>
                  <button
                    onClick={() => onContribute(goal.id)}
                    className="btn-secondary !py-1 !px-2.5 !text-[11px]"
                  >
                    + Add
                  </button>
                </div>
                <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                    style={{
                      width:
                        progress > 0 ? `max(${progress.toFixed(2)}%, 4px)` : "0%",
                    }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-zinc-500 mt-1 tabular-nums">
                  <span className="truncate max-w-[170px]">
                    {goal.sinkingMonthly > 0
                      ? `Save ${formatCurrency(goal.sinkingMonthly)}/mo for the bill`
                      : pacing && (pacing.status === "ON_TRACK" || pacing.status === "SLIGHTLY_BEHIND" || pacing.status === "BEHIND")
                      ? `${formatCurrency(pacing.requiredPerMonth)}/mo pace`
                      : ""}
                  </span>
                  <span>{Math.min(100, Math.max(0, progress)).toFixed(1)}% complete</span>
                </div>
              </div>
            );
          })}

        {/* Mobile Show All Toggle (M5) */}
        {(activeDebts.length + (savingsSummary || []).length > 3) && (
          <button
            type="button"
            onClick={() => setShowAllMobile(!showAllMobile)}
            className="sm:hidden w-full py-2 px-3 rounded-lg bg-zinc-900 border border-white/10 text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <span>{showAllMobile ? "Show less" : `Show all (${activeDebts.length + (savingsSummary || []).length})`}</span>
          </button>
        )}

        {activeDebts.length === 0 &&
          (!savingsSummary || savingsSummary.length === 0) && (
            <div className="py-5 px-4 rounded-xl border border-dashed border-white/[0.07] text-center">
              <p className="text-zinc-500 text-xs font-medium mb-3">
                No active debts or savings goals tracked yet.
              </p>
              <div className="flex items-center justify-center gap-2">
                {onAddDebt && (
                  <button
                    type="button"
                    onClick={onAddDebt}
                    className="btn-secondary !py-1 !px-2.5 !text-[11px]"
                  >
                    <Plus size={11} />
                    <span>Add first debt</span>
                  </button>
                )}
                {onAddSavingsGoal && (
                  <button
                    type="button"
                    onClick={onAddSavingsGoal}
                    className="btn-secondary !py-1 !px-2.5 !text-[11px]"
                  >
                    <Plus size={11} />
                    <span>Create savings goal</span>
                  </button>
                )}
              </div>
            </div>
          )}
      </div>
    </div>
  );
};

export default ProgressSection;
