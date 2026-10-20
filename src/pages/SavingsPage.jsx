import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, PiggyBank, Calendar } from "lucide-react";
import { calculatePacing } from "../utils/savingsPacing";
import { formatCurrency } from "../utils/formatUtils";
import AddSavingsContributionModal from "../components/Modals/AddSavingsContributionModal";
import AddSavingsGoalModal from "../components/Modals/AddSavingsGoalModal";
import EditSavingsGoalModal from "../components/Modals/EditSavingsGoalModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";

const getRegBadge = (type) => {
  switch (type) {
    case "TFSA":
      return {
        label: "TFSA",
        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        full: "Tax-Free Savings Account",
      };
    case "RRSP":
      return {
        label: "RRSP",
        className: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        full: "Registered Retirement Savings Plan",
      };
    case "FHSA":
      return {
        label: "FHSA",
        className: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        full: "First Home Savings Account",
      };
    default:
      return null;
  }
};

const SavingsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isAddGoalModalOpen, setAddGoalModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState(null);
  const [activeGoal, setActiveGoal] = useState(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.fetchSavingsGoals();
      setGoals(data);
    } catch (error) {
      console.error("Error fetching savings goals:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleOpenSavingsModal = (goalId) => {
    setActiveGoalId(goalId);
    setIsSavingsModalOpen(true);
  };

  const handleOpenEditModal = (goal) => {
    setActiveGoal(goal);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    await dashboardService.deleteSavingsGoal(activeGoalId);
    setDeleteModalOpen(false);
    setActiveGoal(null);
    fetchGoals();
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading savings goals...
      </div>
    );
  }

  const totalSaved = goals.reduce(
    (s, g) => s + (parseFloat(g.current_amount) || 0),
    0
  );
  const totalTarget = goals.reduce(
    (s, g) => s + (parseFloat(g.goal_amount) || 0),
    0
  );
  const overallProgress =
    totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="flex justify-between items-center pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Reserves
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Savings Goals
          </h1>
        </div>
        <button
          onClick={() => setAddGoalModalOpen(true)}
          className="btn-primary"
        >
          <Plus size={14} strokeWidth={2} />
          <span>Add Goal</span>
        </button>
      </div>

      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Total Saved
            </p>
            <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
              $
              {totalSaved.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Combined Target
            </p>
            <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
              $
              {totalTarget.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Overall Progress
            </p>
            <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
              {overallProgress.toFixed(1)}%
            </p>
          </div>
        </div>
      )}

      {goals.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-3">
            <PiggyBank size={18} />
          </div>
          <p className="text-zinc-300 text-sm font-medium mb-1">
            No savings goals created yet
          </p>
          <p className="text-zinc-500 text-xs max-w-xs mb-5">
            Set a target amount for your emergency fund, travel, or major purchases and track your progress.
          </p>
          <button
            onClick={() => setAddGoalModalOpen(true)}
            className="btn-primary"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Create First Goal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const pacing = calculatePacing(goal, "bi-weekly");
            const current = parseFloat(goal.current_amount) || 0;
            const target = parseFloat(goal.goal_amount) || 0;
            const progress = target > 0 ? (current / target) * 100 : 0;
            const remaining = Math.max(0, target - current);
            const regBadge = getRegBadge(goal.registeredType);

            return (
              <div
                key={goal.id}
                className="glass-panel p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-semibold text-zinc-100">
                          {goal.name}
                        </h2>
                        {regBadge && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${regBadge.className}`}
                            title={regBadge.full}
                          >
                            {regBadge.label}
                          </span>
                        )}
                      </div>
                      {goal.target_date && (
                        <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={11} />
                          <span>
                            Target{" "}
                            {new Date(goal.target_date).toLocaleDateString(
                              "en-US",
                              {
                                timeZone: "UTC",
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-3">
                      <button
                        onClick={() => handleOpenEditModal(goal)}
                        title="Edit goal"
                        className="btn-ghost-icon"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => {
                          setActiveGoalId(goal.id);
                          setActiveGoal(goal);
                          setDeleteModalOpen(true);
                        }}
                        title="Delete goal"
                        className="btn-ghost-icon hover:text-rose-400"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        onClick={() => handleOpenSavingsModal(goal.id)}
                        className="btn-secondary ml-1"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs text-zinc-500 mb-0.5">Saved</p>
                    <div className="flex items-baseline gap-2 tabular-nums">
                      <span className="text-2xl font-semibold text-emerald-400">
                        $
                        {current.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-xs text-zinc-500">
                        of $
                        {target.toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Registered Account Contribution Room Tracker (Phase J) */}
                  {goal.registeredType && (
                    <div className="mb-4 p-3 rounded-xl bg-zinc-950/70 border border-white/[0.06] text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-zinc-400">
                          {goal.registeredType} Room ({goal.roomYear || new Date().getFullYear()})
                        </span>
                        {goal.contributionRoom !== null && goal.contributionRoom !== undefined ? (
                          <span className="text-zinc-200 tabular-nums">
                            Room left:{" "}
                            <strong
                              className={
                                goal.isOverContributed
                                  ? "text-rose-400 font-semibold"
                                  : "text-emerald-400 font-semibold"
                              }
                            >
                              {formatCurrency(goal.roomLeft)}
                            </strong>
                            <span className="text-zinc-500">
                              {" "}of {formatCurrency(goal.contributionRoom)}
                            </span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(goal)}
                            className="text-amber-400 hover:text-amber-300 underline text-[10px]"
                          >
                            Set contribution room
                          </button>
                        )}
                      </div>

                      {goal.isOverContributed && (
                        <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-2 font-medium">
                          ⚠️ Over-contributed by {formatCurrency(Math.abs(goal.roomLeft))} — CRA penalties may apply
                        </div>
                      )}

                      {goal.registeredType === "TFSA" && goal.roomReturnsNextYear > 0 && (
                        <p className="text-[11px] text-cyan-400/90 font-medium">
                          +{formatCurrency(goal.roomReturnsNextYear)} withdrawn room returns Jan 1
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width:
                          progress > 0
                            ? `max(${Math.min(100, progress).toFixed(2)}%, 4px)`
                            : "0%",
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-zinc-500 mt-2 tabular-nums">
                    <span>{progress.toFixed(1)}% complete</span>
                    <span>
                      $
                      {remaining.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      left
                    </span>
                  </div>

                  {/* Pacing line and badge (Phase I) */}
                  <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between text-[11px] gap-2">
                    <span className="text-zinc-400 truncate" title={pacing.copy}>
                      {pacing.status === "NO_TARGET_DATE" ? (
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(goal)}
                          className="text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                        >
                          <Pencil size={10} />
                          <span>Add target date for monthly pace</span>
                        </button>
                      ) : pacing.status === "REACHED" ? (
                        <span className="text-emerald-400 font-medium">Goal reached! 🎉</span>
                      ) : (
                        <span>
                          Save <strong className="text-zinc-200 font-semibold">{formatCurrency(pacing.requiredPerMonth)}/mo</strong>
                          <span className="text-zinc-500"> (~{formatCurrency(pacing.perPaycheque)}/paycheque)</span>
                        </span>
                      )}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border shrink-0 ${pacing.badgeClass}`}
                    >
                      {pacing.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddSavingsContributionModal
        isOpen={isSavingsModalOpen}
        onClose={() => setIsSavingsModalOpen(false)}
        refreshData={fetchGoals}
        goalId={activeGoalId}
      />
      <AddSavingsGoalModal
        isOpen={isAddGoalModalOpen}
        onClose={() => setAddGoalModalOpen(false)}
        refreshData={fetchGoals}
      />
      <EditSavingsGoalModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        refreshData={fetchGoals}
        goal={activeGoal}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemType="savings goal"
        itemName={activeGoal?.name}
      />
    </div>
  );
};

export default SavingsPage;
