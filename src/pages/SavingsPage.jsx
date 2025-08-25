import { useState, useEffect } from "react";
import AddSavingsContributionModal from "../components/Modals/AddSavingsContributionModal";
import AddSavingsGoalModal from "../components/Modals/AddSavingsGoalModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";

const SavingsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [isAddGoalModalOpen, setAddGoalModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState(null);

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
          const progress =
            parseFloat(goal.goal_amount) > 0
              ? (parseFloat(goal.current_amount) /
                  parseFloat(goal.goal_amount)) *
                100
              : 0;
          return (
            <div key={goal.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{goal.name}</h2>
                <div>
                  <button
                    onClick={() => {
                      setActiveGoalId(goal.id);
                      setDeleteModalOpen(true);
                    }}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded mr-2"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleOpenSavingsModal(goal.id)}
                    className="text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Contribute
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                ${parseFloat(goal.current_amount).toFixed(2)} / $
                {parseFloat(goal.goal_amount).toFixed(2)}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                <div
                  className="bg-green-500 h-2.5 rounded-full"
                  style={{ width: `${progress.toFixed(0)}%` }}
                ></div>
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
