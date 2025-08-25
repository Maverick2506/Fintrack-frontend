import { useState, useEffect } from "react";
import AddSavingsContributionModal from "../components/Modals/AddSavingsContributionModal";
import dashboardService from "../services/dashboardService"; // Use the service

const SavingsPage = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSavingsModalOpen, setIsSavingsModalOpen] = useState(false);
  const [activeGoalId, setActiveGoalId] = useState(null);

  const fetchGoals = async () => {
    setLoading(true);
    try {
      // Use the service which sends the auth token
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

  if (loading) {
    return (
      <div className="text-center text-white p-10">
        Loading savings goals...
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Savings Goals</h1>
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
                <button
                  onClick={() => handleOpenSavingsModal(goal.id)}
                  className="text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded"
                >
                  Contribute
                </button>
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
    </div>
  );
};

export default SavingsPage;
