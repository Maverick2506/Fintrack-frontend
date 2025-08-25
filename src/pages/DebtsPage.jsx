import { useState, useEffect } from "react";
import AddDebtPaymentModal from "../components/Modals/AddDebtPaymentModal";
import dashboardService from "../services/dashboardService"; // Use the service

const DebtsPage = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [activeDebtId, setActiveDebtId] = useState(null);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      // Use the service which sends the auth token
      const data = await dashboardService.fetchDebts();
      setDebts(data);
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const handleOpenDebtModal = (debtId) => {
    setActiveDebtId(debtId);
    setIsDebtModalOpen(true);
  };

  if (loading) {
    return <div className="text-center text-white p-10">Loading debts...</div>;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <h1 className="text-2xl font-bold text-white mb-6">Debt Management</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.map((debt) => {
          const totalAmount = parseFloat(debt.monthly_payment || 0) * 24 + 800;
          const progress =
            totalAmount > 0
              ? ((totalAmount - parseFloat(debt.total_remaining)) /
                  totalAmount) *
                100
              : 0;

          return (
            <div key={debt.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{debt.name}</h2>
                <button
                  onClick={() => handleOpenDebtModal(debt.id)}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                >
                  Pay
                </button>
              </div>
              <p className="text-sm text-gray-400">
                Remaining: ${parseFloat(debt.total_remaining).toFixed(2)}
              </p>
              <div className="w-full bg-gray-700 rounded-full h-2.5 mt-4">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${progress.toFixed(0)}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>
      <AddDebtPaymentModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        refreshData={fetchDebts}
        debtId={activeDebtId}
      />
    </div>
  );
};

export default DebtsPage;
