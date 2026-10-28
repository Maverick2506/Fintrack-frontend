import { useState, useEffect } from "react";
import { X, PiggyBank, Calendar, AlertCircle } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import LinkedBillField from "./LinkedBillField";
import { linkPayload } from "../../utils/planningAlerts";

const EditSavingsGoalModal = ({ isOpen, onClose, refreshData, goal }) => {
  const [name, setName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [registeredType, setRegisteredType] = useState("");
  const [linkedBillId, setLinkedBillId] = useState(null);
  const [contributionRoom, setContributionRoom] = useState("");
  const [roomYear, setRoomYear] = useState(new Date().getFullYear().toString());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (goal) {
      setName(goal.name || "");
      setGoalAmount(goal.goal_amount || "");
      setCurrentAmount(goal.current_amount ?? "");
      setTargetDate(
        goal.target_date
          ? new Date(goal.target_date).toISOString().slice(0, 10)
          : ""
      );
      setRegisteredType(goal.registeredType || "");
      setLinkedBillId(goal.linkedRecurringGroupId || null);
      setContributionRoom(
        goal.contributionRoom !== null && goal.contributionRoom !== undefined
          ? goal.contributionRoom
          : ""
      );
      setRoomYear(
        goal.roomYear
          ? goal.roomYear.toString()
          : new Date().getFullYear().toString()
      );
    }
  }, [goal]);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!name || !goalAmount) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await dashboardService.updateSavingsGoal(goal.id, {
        name,
        goal_amount: goalAmount,
        current_amount: currentAmount,
        target_date: targetDate || null,
        ...linkPayload(linkedBillId),
        registeredType: registeredType || null,
        contributionRoom:
          registeredType && contributionRoom !== ""
            ? parseFloat(contributionRoom)
            : null,
        roomYear:
          registeredType && roomYear ? parseInt(roomYear, 10) : null,
      });
      onClose();
      refreshData();
    } catch (err) {
      console.error("Failed to update savings goal:", err);
      setError(err?.response?.data?.error || "Failed to update savings goal");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-white/[0.09] rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              Reserve
            </p>
            <h2 className="text-sm font-semibold text-zinc-100 mt-0.5">
              Edit Savings Goal
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-icon"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          <div className="py-3 px-4 rounded-xl bg-zinc-950/70 border border-white/[0.06]">
            <label
              htmlFor="goalAmountEdit"
              className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
            >
              Target Amount
            </label>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-medium text-emerald-400 select-none">
                $
              </span>
              <input
                type="number"
                id="goalAmountEdit"
                step="0.01"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                className="w-full bg-transparent text-3xl font-semibold tracking-tight text-zinc-100 placeholder-zinc-700 focus:outline-none tabular-nums"
                required
              />
            </div>
            <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center gap-2">
              <PiggyBank size={14} className="text-zinc-500 flex-shrink-0" />
              <input
                type="text"
                id="goalNameEdit"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
              <label
                htmlFor="currentAmountEdit"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Current Saved
              </label>
              <div className="flex items-baseline gap-1">
                <span className="text-xs font-medium text-zinc-500">$</span>
                <input
                  type="number"
                  id="currentAmountEdit"
                  step="0.01"
                  value={currentAmount}
                  onChange={(e) => setCurrentAmount(e.target.value)}
                  className="w-full bg-transparent text-xs font-medium text-zinc-200 placeholder-zinc-600 focus:outline-none tabular-nums"
                />
              </div>
            </div>

            <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
              <label
                htmlFor="targetDateEdit"
                className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1"
              >
                <Calendar size={11} /> Target Date
              </label>
              <input
                type="date"
                id="targetDateEdit"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-transparent text-xs font-medium text-zinc-200 focus:outline-none tabular-nums"
              />
            </div>
          </div>

          <LinkedBillField
            id="linkedBillEdit"
            value={linkedBillId}
            onChange={setLinkedBillId}
            onPick={(bill) => {
              if (!goalAmount) setGoalAmount(String(bill.amount));
            }}
            targetDate={targetDate}
          />

          {/* Phase J: Registered Account (TFSA / RRSP / FHSA) */}
          <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] p-3 space-y-3">
            <div>
              <label
                htmlFor="registeredTypeEdit"
                className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
              >
                Registered Account (Canada)
              </label>
              <select
                id="registeredTypeEdit"
                value={registeredType}
                onChange={(e) => setRegisteredType(e.target.value)}
                className="w-full bg-zinc-900 border border-white/[0.08] text-xs font-medium text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
              >
                <option value="">None (Standard Savings Goal)</option>
                <option value="TFSA">TFSA — Tax-Free Savings Account</option>
                <option value="RRSP">RRSP — Registered Retirement Savings Plan</option>
                <option value="FHSA">FHSA — First Home Savings Account</option>
              </select>
            </div>

            {registeredType && (
              <>
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label
                      htmlFor="contributionRoomEdit"
                      className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
                    >
                      Contribution Room ($)
                    </label>
                    <div className="flex items-baseline gap-1 bg-zinc-900 border border-white/[0.08] rounded-lg px-2.5 py-1">
                      <span className="text-xs font-medium text-zinc-500">$</span>
                      <input
                        type="number"
                        id="contributionRoomEdit"
                        step="0.01"
                        value={contributionRoom}
                        onChange={(e) => setContributionRoom(e.target.value)}
                        placeholder="e.g. 7000"
                        className="w-full bg-transparent text-xs font-medium text-zinc-200 placeholder-zinc-600 focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="roomYearEdit"
                      className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
                    >
                      Tax Year
                    </label>
                    <input
                      type="number"
                      id="roomYearEdit"
                      value={roomYear}
                      onChange={(e) => setRoomYear(e.target.value)}
                      placeholder="2026"
                      className="w-full bg-zinc-900 border border-white/[0.08] text-xs font-medium text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none tabular-nums"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed bg-zinc-900/60 rounded-lg p-2 border border-white/[0.04]">
                  {registeredType === "RRSP" && (
                    <span>
                      💡 <strong>RRSP 60-day rule:</strong> Contributions made in the first 60 days of the year can be deducted for the previous tax year. Enter the available room from your CRA Notice of Assessment.
                    </span>
                  )}
                  {registeredType === "TFSA" && (
                    <span>
                      💡 <strong>TFSA withdrawals:</strong> Amounts withdrawn in the current calendar year will be re-added to your contribution room on January 1 of the following year.
                    </span>
                  )}
                  {registeredType === "FHSA" && (
                    <span>
                      💡 <strong>FHSA annual room:</strong> Enter your available FHSA room from your CRA Notice of Assessment (annual new room is up to $8,000, lifetime $40,000).
                    </span>
                  )}
                </p>
              </>
            )}
          </div>

          {error && (
            <p className="text-xs text-rose-400 flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
              <AlertCircle size={13} className="shrink-0" />
              <span>{error}</span>
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSavingsGoalModal;
