import { useState, useEffect } from "react";
import AddDebtModal from "../components/Modals/AddDebtModal";
import AddDebtPaymentModal from "../components/Modals/AddDebtPaymentModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";

const DebtsPage = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [isAddDebtModalOpen, setAddDebtModalOpen] = useState(false);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeDebtId, setActiveDebtId] = useState(null);

  const fetchDebts = async () => {
    setLoading(true);
    try {
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

  const handleDelete = async () => {
    await dashboardService.deleteDebt(activeDebtId);
    setDeleteModalOpen(false);
    fetchDebts();
  };

  if (loading) {
    return <div className="text-center text-white p-10">Loading debts...</div>;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Debt Management</h1>
        <button
          onClick={() => setAddDebtModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          Add Debt
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.map((debt) => {
          const progress =
            parseFloat(debt.total_amount) > 0
              ? ((parseFloat(debt.total_amount) -
                  parseFloat(debt.total_remaining)) /
                  parseFloat(debt.total_amount)) *
                100
              : 0;

          return (
            <div key={debt.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{debt.name}</h2>
                <div>
                  <button
                    onClick={() => {
                      setActiveDebtId(debt.id);
                      setDeleteModalOpen(true);
                    }}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded mr-2"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleOpenDebtModal(debt.id)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Pay
                  </button>
                </div>
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
      <AddDebtModal
        isOpen={isAddDebtModalOpen}
        onClose={() => setAddDebtModalOpen(false)}
        refreshData={fetchDebts}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemType="debt"
      />
    </div>
  );
};

export default DebtsPage;
