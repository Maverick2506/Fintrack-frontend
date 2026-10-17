import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-12

  const isCurrentMonth =
    selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  const selectedDate = new Date(selectedYear, selectedMonth - 1, 1);

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleResetMonth = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    isError: dashboardError,
    refetch: refetchDashboard,
  } = useQuery({
    queryKey: ["dashboardData", selectedYear, selectedMonth],
    queryFn: () =>
      dashboardService.fetchDashboard(selectedYear, selectedMonth),
  });

  const { data: spendingData, isLoading: spendingLoading } = useQuery({
    queryKey: ["spendingData", selectedYear, selectedMonth],
    queryFn: () =>
      dashboardService.fetchSpendingSummary(selectedYear, selectedMonth),
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
  const [advice, setAdvice] = useState(
    () => localStorage.getItem("fintrack_advice") || ""
  );
  const [adviceLoading, setAdviceLoading] = useState(false);

  const openModal = (type, payload = {}) => {
    setModals((prev) => ({ ...prev, [type]: true }));
    setActive((prev) => ({ ...prev, ...payload }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    setActive({ debtId: null, goalId: null, toDelete: null, toEdit: null });
  };

  // Global keyboard shortcut: press "n" (outside inputs) to open New Transaction
  useEffect(() => {
    const anyModalOpen = Object.values(modals).some(Boolean);
    const handleKeyDown = (e) => {
      if (anyModalOpen) return;
      const tag = document.activeElement?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (
        (e.key === "n" || e.key === "N") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        openModal("transaction");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modals]);

  const invalidateDashboard = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboardData"] });
    queryClient.invalidateQueries({ queryKey: ["spendingData"] });
  };

  const markAsPaidMutation = useMutation({
    mutationFn: (billId) => dashboardService.markBillAsPaid(billId),
    onSuccess: () => {
      invalidateDashboard();
    },
  });

  const deleteBillMutation = useMutation({
    mutationFn: (billId) => dashboardService.deleteBill(billId),
    onSuccess: () => {
      invalidateDashboard();
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

  const handleGetAdvice = async () => {
    setAdviceLoading(true);
    try {
      const adviceResponse = await dashboardService.getFinancialAdvice(
        dashboardData
      );
      setAdvice(adviceResponse.advice);
      localStorage.setItem("fintrack_advice", adviceResponse.advice);
    } catch (error) {
      setAdvice("Sorry, I could not get any advice at the moment.");
    } finally {
      setAdviceLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-950 min-h-[80vh] text-zinc-500 text-sm flex items-center justify-center">
        Loading overview...
      </div>
    );
  }

  if (dashboardError || !dashboardData) {
    return (
      <div className="bg-zinc-950 min-h-[80vh] text-zinc-400 text-sm flex flex-col items-center justify-center gap-3 px-4 text-center">
        <p>Unable to load your overview right now.</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetchDashboard()}
            className="btn-secondary"
          >
            Try Again
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("user_token");
              localStorage.removeItem("fintrack_last_active");
              window.location.replace("/login");
            }}
            className="btn-primary"
          >
            Sign In Again
          </button>
        </div>
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

  const totalSavings = (savingsSummary || []).reduce(
    (s, g) => s + parseFloat(g.initialBalance || 0),
    0
  );
  const totalDebt = (debtSummary || []).reduce(
    (s, d) => s + parseFloat(d.initialBalance || 0),
    0
  );
  const totalCC = (creditCardSummary || []).reduce(
    (s, c) => s + parseFloat(c.initialBalance || 0),
    0
  );
  const netFlow = monthlySummary?.netFlow || 0;
  const netWorth = totalSavings + netFlow - totalDebt - totalCC;
  const positiveNetWorth = netWorth >= 0;

  return (
    <div className="min-h-screen text-zinc-100 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <Header
          onAddTransaction={() => openModal("transaction")}
          selectedDate={selectedDate}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          onResetMonth={handleResetMonth}
          isCurrentMonth={isCurrentMonth}
        />

        {/* Top KPI Bento Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Estimated Net Worth
            </p>
            <p
              className={`text-2xl font-semibold tracking-tight tabular-nums ${
                positiveNetWorth ? "text-zinc-100" : "text-rose-400"
              }`}
            >
              {positiveNetWorth ? "" : "-"}$
              {Math.abs(netWorth).toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Total Savings
            </p>
            <p className="text-2xl font-semibold tracking-tight text-emerald-400 tabular-nums">
              $
              {totalSavings.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Active Debt
            </p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-200 tabular-nums">
              $
              {totalDebt.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Card Balances
            </p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-200 tabular-nums">
              $
              {totalCC.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
          </div>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 space-y-6">
            <MonthlySummary summary={monthlySummary} />
            <UpcomingBills
              bills={upcomingBills}
              onMarkAsPaid={handleMarkAsPaid}
              onEdit={(bill) => openModal("transaction", { toEdit: bill })}
              onDelete={(billId) => openModal("delete", { toDelete: billId })}
            />
            {spendingData && spendingData.length > 0 && (
              <SpendingChartCard data={spendingData} />
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <FinancialAdviceCard
              advice={advice}
              onGetAdvice={handleGetAdvice}
              isLoading={adviceLoading}
            />
            <CreditCardSummary creditCards={creditCardSummary} />
            <ProgressSection
              debtSummary={debtSummary}
              savingsSummary={savingsSummary}
              onPayDebt={(id) => openModal("debt", { debtId: id })}
              onContribute={(id) => openModal("savings", { goalId: id })}
              onAddDebt={() => openModal("addDebt")}
              onAddSavingsGoal={() => openModal("addSavingsGoal")}
            />
          </div>
        </main>
      </div>

      {/* All Modals */}
      <AddTransactionModal
        isOpen={modals.transaction}
        onClose={() => closeModal("transaction")}
        refreshData={invalidateDashboard}
        existingTransaction={active.toEdit}
      />
      <AddDebtPaymentModal
        isOpen={modals.debt}
        onClose={() => closeModal("debt")}
        refreshData={invalidateDashboard}
        debtId={active.debtId}
      />
      <AddDebtModal
        isOpen={modals.addDebt}
        onClose={() => closeModal("addDebt")}
        refreshData={invalidateDashboard}
      />
      <AddSavingsContributionModal
        isOpen={modals.savings}
        onClose={() => closeModal("savings")}
        refreshData={invalidateDashboard}
        goalId={active.goalId}
      />
      <AddSavingsGoalModal
        isOpen={modals.addSavingsGoal}
        onClose={() => closeModal("addSavingsGoal")}
        refreshData={invalidateDashboard}
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
