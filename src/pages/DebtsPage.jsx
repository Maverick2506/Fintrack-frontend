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

  const handleOpenDebtModal = (debt) => {
    setActiveDebt(debt);
    setIsDebtModalOpen(true);
  };

  const handleOpenEditModal = (debt) => {
    setActiveDebt(debt);
    setIsEditModalOpen(true);
  };

  const handleDelete = async () => {
    await dashboardService.deleteDebt(activeDebt.id);
    setDeleteModalOpen(false);
    fetchDebts();
  };

  if (loading) {
    return <div className="text-center text-white p-10">Loading debts...</div>;
  }

  return (
    <div className="container mx-auto max-w-7xl p-4">
      {/* ... (existing header) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.map((debt) => {
          // ... (existing progress calculation)
          return (
            <div key={debt.id} className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-white">{debt.name}</h2>
                <div>
                  <button
                    onClick={() => handleOpenEditModal(debt)}
                    className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded mr-2"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setActiveDebt(debt);
                      setDeleteModalOpen(true);
                    }}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded mr-2"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => handleOpenDebtModal(debt)}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Pay
                  </button>
                </div>
              </div>
              {/* ... (existing info and progress bar) */}
            </div>
          );
        })}
      </div>
      <AddDebtPaymentModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        refreshData={fetchDebts}
        debtId={activeDebt?.id}
      />
      <AddDebtModal
        isOpen={isAddDebtModalOpen}
        onClose={() => setAddDebtModalOpen(false)}
        refreshData={fetchDebts}
      />
      <EditDebtModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        refreshData={fetchDebts}
        debt={activeDebt}
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
