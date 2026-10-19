import React from "react";
import { Plus } from "lucide-react";

const ProgressSection = ({
  debtSummary,
  savingsSummary,
  onPayDebt,
  onContribute,
  onAddDebt,
  onAddSavingsGoal,
}) => {
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
          activeDebts.map((debt) => {
            const originalAmount =
              parseFloat(debt.targetAmount) ||
              parseFloat(debt.initialBalance) ||
              1;
            const currentAmount = parseFloat(debt.initialBalance) || 0;
            const progress =
              ((originalAmount - currentAmount) / originalAmount) * 100;

            return (
              <div key={debt.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">
                      {debt.name}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 tabular-nums">
                      ${currentAmount.toFixed(2)} left
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
          savingsSummary.map((goal) => {
            const target = parseFloat(goal.targetAmount) || 1;
            const current = parseFloat(goal.initialBalance) || 0;
            const progress = (current / target) * 100;

            return (
              <div key={goal.id}>
                <div className="flex justify-between items-center mb-1.5">
                  <div>
                    <span className="text-sm font-medium text-zinc-200">
                      {goal.name}
                    </span>
                    <span className="ml-2 text-xs text-zinc-500 tabular-nums">
                      ${current.toFixed(2)} / ${target.toFixed(2)}
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
                <p className="text-[11px] text-zinc-500 text-right mt-1 tabular-nums">
                  {Math.min(100, Math.max(0, progress)).toFixed(1)}% complete
                </p>
              </div>
            );
          })}

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
