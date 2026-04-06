import { useState, useEffect } from "react";
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
      <div className="text-center text-white p-10">
        Loading savings goals...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Savings Goals</h1>
        <button
          onClick={() => setAddGoalModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Goal
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const current = parseFloat(goal.current_amount);
          const target = parseFloat(goal.goal_amount);
          const progress = target > 0 ? (current / target) * 100 : 0;
          const remaining = target - current;

          return (
            <div key={goal.id} className="bg-gray-800 p-5 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-bold text-white">{goal.name}</h2>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <button
                    onClick={() => handleOpenEditModal(goal)}
                    className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setActiveGoalId(goal.id);
                      setDeleteModalOpen(true);
                    }}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleOpenSavingsModal(goal.id)}
                    className="text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                  >
                    + Add
                  </button>
                </div>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-green-400 font-semibold">${current.toFixed(2)}</span>
                <span className="text-gray-400">Goal: ${target.toFixed(2)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-gradient-to-r from-green-500 to-emerald-400 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: progress > 0 ? `max(${progress.toFixed(2)}%, 4px)` : '0%' }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-2">
                <span>{progress.toFixed(1)}% complete</span>
                <span>${remaining.toFixed(2)} remaining</span>
              </div>
            </div>
          );
        })}
      </div>
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
