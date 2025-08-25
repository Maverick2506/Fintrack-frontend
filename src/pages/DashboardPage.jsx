import { useState, useEffect } from "react";
import Header from "../components/Layout/Header";
import MonthlySummary from "../components/Dashboard/MonthlySummary";
import UpcomingBills from "../components/Dashboard/UpcomingBills";
import ProgressSection from "../components/Dashboard/ProgressSection";
import AddTransactionModal from "../components/Modals/AddTransactionModal";
import AddDebtPaymentModal from "../components/Modals/AddDebtPaymentModal";
import AddSavingsContributionModal from "../components/Modals/AddSavingsContributionModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import dashboardService from "../services/dashboardService";
import FinancialAdviceCard from "../components/Dashboard/FinancialAdviceCard";
import AdviceModal from "../components/Modals/AdviceModal";
import SpendingChartCard from "../components/Dashboard/SpendingChartCard";
// No longer need to import axios directly here

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [spendingData, setSpendingData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modals, setModals] = useState({
    transaction: false,
    debt: false,
    savings: false,
    delete: false,
    advice: false,
  });
  const [active, setActive] = useState({
    debtId: null,
    goalId: null,
    toDelete: null,
    toEdit: null,
  });
  const [advice, setAdvice] = useState("");
  const [adviceLoading, setAdviceLoading] = useState(false);

  const fetchAllData = async () => {
    try {
      const [dashboardRes, spendingRes] = await Promise.all([
        dashboardService.fetchDashboard(),
        // Use the service function which includes the auth token
        dashboardService.fetchSpendingSummary(),
      ]);
      setDashboardData(dashboardRes);
      setSpendingData(spendingRes);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAllData();
  }, []);

  const openModal = (type, payload = {}) => {
    setModals((prev) => ({ ...prev, [type]: true }));
    setActive((prev) => ({ ...prev, ...payload }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    setActive({ debtId: null, goalId: null, toDelete: null, toEdit: null });
  };

  const handleMarkAsPaid = async (billId) => {
    await dashboardService.markBillAsPaid(billId);
    fetchAllData();
  };

  const handleDeleteConfirm = async () => {
    if (!active.toDelete) return;
    await dashboardService.deleteBill(active.toDelete);
    closeModal("delete");
    fetchAllData();
  };

  const handleGetAdvice = async () => {
    openModal("advice");
    setAdviceLoading(true);
    try {
      const adviceText = await dashboardService.getFinancialAdvice(
        dashboardData
      );
      setAdvice(adviceText);
    } catch (error) {
      setAdvice("Sorry, I could not get any advice at the moment.");
    } finally {
      setAdviceLoading(false);
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="bg-gray-900 min-h-screen text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const { monthlySummary, upcomingBills, debtSummary, savingsSummary } =
    dashboardData;

  return (
    <div className="min-h-screen text-gray-200 font-sans pb-24">
      <div className="container mx-auto max-w-7xl p-4">
        <Header />
        <main className="flex flex-col lg:flex-row gap-6">
          <div className="lg:w-1/2 space-y-6">
            <MonthlySummary summary={monthlySummary} />
            <UpcomingBills
              bills={upcomingBills}
              onMarkAsPaid={handleMarkAsPaid}
              onEdit={(bill) => openModal("transaction", { toEdit: bill })}
              onDelete={(billId) => openModal("delete", { toDelete: billId })}
            />
            {spendingData.length > 0 && (
              <SpendingChartCard data={spendingData} />
            )}
          </div>
          <div className="lg:w-1/2 space-y-6">
            <ProgressSection
              debtSummary={debtSummary}
              savingsSummary={savingsSummary}
              onPayDebt={(id) => openModal("debt", { debtId: id })}
              onContribute={(id) => openModal("savings", { goalId: id })}
            />
            <FinancialAdviceCard
              onGetAdvice={handleGetAdvice}
              isLoading={adviceLoading}
            />
          </div>
        </main>
      </div>

      <button
        onClick={() => openModal("transaction")}
        className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center text-3xl pb-1 font-bold shadow-lg hover:bg-blue-700"
      >
        +
      </button>

      {/* All Modals */}
      <AddTransactionModal
        isOpen={modals.transaction}
        onClose={() => closeModal("transaction")}
        refreshData={fetchAllData}
        existingTransaction={active.toEdit}
      />
      <AddDebtPaymentModal
        isOpen={modals.debt}
        onClose={() => closeModal("debt")}
        refreshData={fetchAllData}
        debtId={active.debtId}
      />
      <AddSavingsContributionModal
        isOpen={modals.savings}
        onClose={() => closeModal("savings")}
        refreshData={fetchAllData}
        goalId={active.goalId}
      />
      <ConfirmDeleteModal
        isOpen={modals.delete}
        onClose={() => closeModal("delete")}
        onConfirm={handleDeleteConfirm}
        itemType="bill"
      />
      <AdviceModal
        isOpen={modals.advice}
        onClose={() => closeModal("advice")}
        advice={advice}
        isLoading={adviceLoading}
      />
    </div>
  );
};

export default DashboardPage;
