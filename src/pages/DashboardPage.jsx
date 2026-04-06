import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Landmark, PiggyBank, Plus } from "lucide-react";
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
import SpendingChartCard from "../components/Dashboard/SpendingChartCard";
import AddDebtModal from "../components/Modals/AddDebtModal";
import AddSavingsGoalModal from "../components/Modals/AddSavingsGoalModal";
import CreditCardSummary from "../components/Dashboard/CreditCardSummary";

const DashboardPage = () => {
  const queryClient = useQueryClient();

  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ["dashboardData"],
    queryFn: () => dashboardService.fetchDashboard(),
  });

  const { data: spendingData, isLoading: spendingLoading } = useQuery({
    queryKey: ["spendingData"],
    queryFn: () => dashboardService.fetchSpendingSummary(),
  });

  const loading = dashboardLoading || spendingLoading;
  const [modals, setModals] = useState({
    transaction: false,
    debt: false,
    savings: false,
    delete: false,
    advice: false,
    addDebt: false,
    addSavingsGoal: false,
  });
  const [active, setActive] = useState({
    debtId: null,
    goalId: null,
    toDelete: null,
    toEdit: null,
  });
  const [advice, setAdvice] = useState(() => localStorage.getItem("fintrack_advice") || "");
  const [adviceLoading, setAdviceLoading] = useState(false);

  const openModal = (type, payload = {}) => {
    setModals((prev) => ({ ...prev, [type]: true }));
    setActive((prev) => ({ ...prev, ...payload }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    setActive({ debtId: null, goalId: null, toDelete: null, toEdit: null });
  };

  const markAsPaidMutation = useMutation({
    mutationFn: (billId) => dashboardService.markBillAsPaid(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (billId) => dashboardService.deleteBill(billId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
      closeModal("delete");
    },
  });

  const handleMarkAsPaid = (billId) => {
    markAsPaidMutation.mutate(billId);
  };

  const handleDeleteConfirm = () => {
    if (!active.toDelete) return;
    deleteBillMutation.mutate(active.toDelete);
  };

  // MODIFIED: This function now sends the entire dashboardData object to the AI
  const handleGetAdvice = async () => {
    setAdviceLoading(true);
    try {
      // Pass the whole object, which now includes credit card data and all upcoming bills
      const adviceResponse = await dashboardService.getFinancialAdvice(
        dashboardData
      );
      setAdvice(adviceResponse.advice); // The backend now sends { advice: "..." }
      localStorage.setItem("fintrack_advice", adviceResponse.advice);
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

  const {
    monthlySummary,
    upcomingBills,
    debtSummary,
    savingsSummary,
    creditCardSummary,
  } = dashboardData;

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
            <CreditCardSummary creditCards={creditCardSummary} />
            <ProgressSection
              debtSummary={debtSummary}
              savingsSummary={savingsSummary}
              onPayDebt={(id) => openModal("debt", { debtId: id })}
              onContribute={(id) => openModal("savings", { goalId: id })}
            />
            {/* Net Worth tile */}
            {(() => {
              const totalSavings = (savingsSummary || []).reduce((s, g) => s + parseFloat(g.current_amount || 0), 0);
              const totalDebt = (debtSummary || []).reduce((s, d) => s + parseFloat(d.total_remaining || 0), 0);
              const totalCC = (creditCardSummary || []).reduce((s, c) => s + parseFloat(c.currentBalance || 0), 0);
              const netFlow = monthlySummary?.netFlow || 0;
              const netWorth = totalSavings + netFlow - totalDebt - totalCC;
              const positive = netWorth >= 0;
              return (
                <div className="bg-gray-800 p-4 rounded-lg">
                  <h2 className="text-sm font-semibold text-gray-400 mb-3">NET WORTH (ESTIMATED)</h2>
                  <p className={`text-3xl font-bold ${positive ? "text-green-400" : "text-red-400"}`}>
                    {positive ? "" : "-"}${Math.abs(netWorth).toFixed(2)}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="text-xs text-gray-400">💰 Savings: <span className="text-green-400">${totalSavings.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-400">📈 Net Flow: <span className={netFlow >= 0 ? "text-green-400" : "text-red-400"}>${netFlow.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-400">🏦 Debts: <span className="text-red-400">-${totalDebt.toFixed(2)}</span></div>
                    <div className="text-xs text-gray-400">💳 CC Balance: <span className="text-red-400">-${totalCC.toFixed(2)}</span></div>
                  </div>
                </div>
              );
            })()}
            <FinancialAdviceCard
              advice={advice}
              onGetAdvice={handleGetAdvice}
              isLoading={adviceLoading}
            />
          </div>
        </main>
      </div>

      <div className="fixed bottom-6 right-6 flex flex-col items-center gap-4">
        <button
          onClick={() => openModal("addDebt")}
          title="Add New Debt"
          className="bg-red-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-red-700 transition-transform transform hover:scale-110"
        >
          <Landmark size={24} />
        </button>
        <button
          onClick={() => openModal("addSavingsGoal")}
          title="Add New Savings Goal"
          className="bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-green-700 transition-transform transform hover:scale-110"
        >
          <PiggyBank size={24} />
        </button>
        <button
          onClick={() => openModal("transaction")}
          title="Add Transaction"
          className="bg-blue-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-700 transition-transform transform hover:scale-110"
        >
          <Plus size={32} />
        </button>
      </div>

      {/* All Modals */}
      <AddTransactionModal
        isOpen={modals.transaction}
        onClose={() => closeModal("transaction")}
        refreshData={() => queryClient.invalidateQueries({ queryKey: ["dashboardData"] })}
        existingTransaction={active.toEdit}
      />
      <AddDebtPaymentModal
        isOpen={modals.debt}
        onClose={() => closeModal("debt")}
        refreshData={() => queryClient.invalidateQueries({ queryKey: ["dashboardData"] })}
        debtId={active.debtId}
      />
      <AddDebtModal
        isOpen={modals.addDebt}
        onClose={() => closeModal("addDebt")}
        refreshData={() => queryClient.invalidateQueries({ queryKey: ["dashboardData"] })}
      />
      <AddSavingsContributionModal
        isOpen={modals.savings}
        onClose={() => closeModal("savings")}
        refreshData={() => queryClient.invalidateQueries({ queryKey: ["dashboardData"] })}
        goalId={active.goalId}
      />
      <AddSavingsGoalModal
        isOpen={modals.addSavingsGoal}
        onClose={() => closeModal("addSavingsGoal")}
        refreshData={() => queryClient.invalidateQueries({ queryKey: ["dashboardData"] })}
      />
      <ConfirmDeleteModal
        isOpen={modals.delete}
        onClose={() => closeModal("delete")}
        onConfirm={handleDeleteConfirm}
        itemType="bill"
      />
    </div>
  );
};

export default DashboardPage;
