import React from "react";

const ProgressSection = ({
  debtSummary,
  savingsSummary,
  onPayDebt,
  onContribute,
}) => {
  return (
    <div className="glass-panel p-6">
      <h2 className="text-sm tracking-widest font-bold text-gray-400/80 mb-6 uppercase">
        Your Progress
      </h2>
      <div className="space-y-6">
        {/* --- All Debts --- */}
        {debtSummary && debtSummary.length > 0 && debtSummary.map((debt) => {
          const originalAmount = parseFloat(debt.targetAmount) || parseFloat(debt.initialBalance) || 1;
          const currentAmount = parseFloat(debt.initialBalance) || 0;
          const progress = ((originalAmount - currentAmount) / originalAmount) * 100;
          
          return (
            <div key={debt.id} className="group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors uppercase tracking-wider">{debt.name} Paydown</span>
                <button
                  onClick={() => onPayDebt(debt.id)}
                  className="text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 py-1.5 px-3 rounded-full transition-colors border border-rose-500/20"
                >
                  Pay
                </button>
              </div>
              <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
                <div
                  className="bg-gradient-to-r from-orange-400 to-rose-400 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(251,113,133,0.5)]"
                  style={{ width: progress > 0 ? `max(${progress.toFixed(1)}%, 4px)` : '0%', minWidth: '4px' }}
                />
              </div>
              <p className="text-[11px] font-semibold text-gray-400 text-right mt-1 tracking-wider">{Math.max(0, progress).toFixed(0)}% PAID</p>
            </div>
          );
        })}

        {/* --- All Savings Goals --- */}
        {savingsSummary && savingsSummary.length > 0 && savingsSummary.map((goal) => {
          const target = parseFloat(goal.targetAmount) || 1;
          const current = parseFloat(goal.initialBalance) || 0;
          const progress = (current / target) * 100;
          
          return (
            <div key={goal.id} className="group">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors uppercase tracking-wider">{goal.name}</span>
                <button
                  onClick={() => onContribute(goal.id)}
                  className="text-xs font-bold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-1.5 px-3 rounded-full transition-colors border border-emerald-500/20"
                >
                  Contribute
                </button>
              </div>
              <div className="w-full bg-black/40 rounded-full h-2.5 overflow-hidden border border-white/5 shadow-inner">
                <div
                  className="bg-gradient-to-r from-emerald-400 to-teal-300 h-2.5 rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                  style={{ width: progress > 0 ? `max(${progress.toFixed(2)}%, 4px)` : '0%', minWidth: '4px' }}
                />
              </div>
              <p className="text-[11px] font-semibold text-gray-400 text-right mt-1 tracking-wider">{Math.min(100, Math.max(0, progress)).toFixed(1)}% COMPLETE</p>
            </div>
          );
        })}

        {(!debtSummary || debtSummary.length === 0) && (!savingsSummary || savingsSummary.length === 0) && (
          <div className="p-4 rounded-xl border border-dashed border-white/20 text-center">
            <p className="text-gray-400 text-sm font-medium">
              ✨ No active debts or savings goals to track.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressSection;
