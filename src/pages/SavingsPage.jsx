import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import AddSavingsContributionModal from "../components/Modals/AddSavingsContributionModal";
import AddSavingsGoalModal from "../components/Modals/AddSavingsGoalModal";
import EditSavingsGoalModal from "../components/Modals/EditSavingsGoalModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";

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
    fetchGoals();
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading savings goals...
      </div>
    );
  }

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

      {goals.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center">
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
            const current = parseFloat(goal.current_amount);
            const target = parseFloat(goal.goal_amount);
            const progress = target > 0 ? (current / target) * 100 : 0;
            const remaining = Math.max(0, target - current);

            return (
              <div
                key={goal.id}
                className="glass-panel p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <h2 className="text-base font-semibold text-zinc-100">
                      {goal.name}
                    </h2>
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
      />
    </div>
  );
};

export default SavingsPage;
