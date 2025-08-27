import { useState, useEffect } from "react";
import AddDebtModal from "../components/Modals/AddDebtModal";
import AddDebtPaymentModal from "../components/Modals/AddDebtPaymentModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import EditDebtModal from "../components/Modals/EditDebtModal";
import dashboardService from "../services/dashboardService";

const DebtsPage = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    add: false,
    pay: false,
    edit: false,
    delete: false,
  });
  // MODIFIED: Use a single state variable to hold the entire active debt object
  const [activeDebt, setActiveDebt] = useState(null);

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

  // Helper function to open modals and set the active debt
  const openModal = (type, debt = null) => {
    setActiveDebt(debt);
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  // Helper function to close all modals and clear the active debt
  const closeModal = () => {
    setModals({ add: false, pay: false, edit: false, delete: false });
    setActiveDebt(null);
  };

  const handleDelete = async () => {
    if (!activeDebt) return;
    await dashboardService.deleteDebt(activeDebt.id);
    closeModal();
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
          onClick={() => openModal("add")}
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
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openModal("edit", debt)}
                    className="text-sm bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => openModal("delete", debt)}
                    className="text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => openModal("pay", debt)}
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
        isOpen={modals.pay}
        onClose={closeModal}
        refreshData={fetchDebts}
        debtId={activeDebt?.id}
      />
      <AddDebtModal
        isOpen={modals.add}
        onClose={closeModal}
        refreshData={fetchDebts}
      />
      <EditDebtModal
        isOpen={modals.edit}
        onClose={closeModal}
        refreshData={fetchDebts}
        debt={activeDebt}
      />
      <ConfirmDeleteModal
        isOpen={modals.delete}
        onClose={closeModal}
        onConfirm={handleDelete}
        itemType="debt"
      />
    </div>
  );
};

export default DebtsPage;
