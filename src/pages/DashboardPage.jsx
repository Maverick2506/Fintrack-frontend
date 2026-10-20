import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { logout } from "../utils/auth";
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
import GeminiGemModal from "../components/Modals/GeminiGemModal";
import { formatCurrency } from "../utils/formatUtils";

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

  const spendingData = dashboardData?.spendingSummary || [];
  const loading = dashboardLoading;

  const upcomingBills = useMemo(() => {
    const raw = dashboardData?.upcomingBills || [];
    const startStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
    const endStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

    return raw.filter((b) => {
      const d = b.date || b.due_date;
      return d && d >= startStr && d <= endStr;
    });
  }, [dashboardData?.upcomingBills, selectedYear, selectedMonth]);
  const [modals, setModals] = useState({
    transaction: false,
    debt: false,
    savings: false,
    delete: false,
    advice: false,
    addDebt: false,
    addSavingsGoal: false,
    geminiModal: false,
  });
  const [active, setActive] = useState({
    debtId: null,
    debt: null,
    goalId: null,
    toDelete: null,
    toEdit: null,
  });
  const [advice, setAdvice] = useState(
    () => localStorage.getItem("fintrack_advice") || ""
  );
  const [structuredAdvice, setStructuredAdvice] = useState(() => {
    try {
      const saved = localStorage.getItem("fintrack_structured_advice");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [adviceLoading, setAdviceLoading] = useState(false);

  const openModal = (type, payload = {}) => {
    setModals((prev) => ({ ...prev, [type]: true }));
    setActive((prev) => ({ ...prev, ...payload }));
  };

  const closeModal = (type) => {
    setModals((prev) => ({ ...prev, [type]: false }));
    setActive({ debtId: null, debt: null, goalId: null, toDelete: null, toEdit: null });
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

  const bulkDeleteBillsMutation = useMutation({
    mutationFn: (ids) => dashboardService.bulkDeleteTransactions(ids),
    onSuccess: () => {
      invalidateDashboard();
      closeModal("delete");
    },
  });

  const updateCheckingMutation = useMutation({
    mutationFn: (balance) => dashboardService.updateCheckingBalance(balance),
    onSuccess: async () => {
      setActive((prev) => ({
        ...prev,
        editingChecking: false,
      }));
      invalidateDashboard();
      await refetchDashboard();
    },
  });

  const handleSaveChecking = () => {
    const raw = active.checkingInput;
    const parsed = parseFloat(String(raw).replace(/[^0-9.-]/g, ""));
    const balance = isNaN(parsed) ? 0 : parsed;
    updateCheckingMutation.mutate(balance);
  };

  const handleMarkAsPaid = (billId) => {
    return markAsPaidMutation.mutateAsync(billId);
  };

  const handleDeleteConfirm = () => {
    if (Array.isArray(active.toDeleteIds) && active.toDeleteIds.length > 0) {
      bulkDeleteBillsMutation.mutate(active.toDeleteIds);
      return;
    }
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
      if (adviceResponse.structured) {
        setStructuredAdvice(adviceResponse.structured);
        localStorage.setItem(
          "fintrack_structured_advice",
          JSON.stringify(adviceResponse.structured)
        );
      }
    } catch {
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
              logout();
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
    checkingAccount,
    debtSummary,
    savingsSummary,
    creditCardSummary,
  } = dashboardData;

  const balancesSummary = dashboardData.balancesSummary || {
    checking: parseFloat(checkingAccount?.currentBalance || 0),
    savings: (savingsSummary || []).reduce(
      (s, g) => s + parseFloat(g.initialBalance || 0),
      0
    ),
    debt: (debtSummary || []).reduce(
      (s, d) => s + parseFloat(d.initialBalance || 0),
      0
    ),
    cards: (creditCardSummary || []).reduce(
      (s, c) => s + parseFloat(c.initialBalance || 0),
      0
    ),
    netWorth:
      parseFloat(checkingAccount?.currentBalance || 0) +
      (savingsSummary || []).reduce((s, g) => s + parseFloat(g.initialBalance || 0), 0) -
      (debtSummary || []).reduce((s, d) => s + parseFloat(d.initialBalance || 0), 0) -
      (creditCardSummary || []).reduce((s, c) => s + parseFloat(c.initialBalance || 0), 0),
  };
  const checkingBalance = balancesSummary.checking;
  const totalSavings = balancesSummary.savings;
  const totalDebt = balancesSummary.debt;
  const totalCC = balancesSummary.cards;
  const netWorth = balancesSummary.netWorth;
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
          <div className="glass-panel p-5 flex flex-col justify-between">
            <div>
              <p className="text-xs font-medium text-zinc-500 mb-1">
                Estimated Net Worth
              </p>
              <p
                className={`text-2xl font-semibold tracking-tight tabular-nums ${
                  positiveNetWorth ? "text-zinc-100" : "text-rose-400"
                }`}
              >
                {formatCurrency(netWorth)}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.06]">
              {active.editingChecking ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-zinc-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={active.checkingInput ?? ""}
                    onChange={(e) =>
                      setActive((prev) => ({
                        ...prev,
                        checkingInput: e.target.value,
                      }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveChecking();
                      } else if (e.key === "Escape") {
                        setActive((prev) => ({
                          ...prev,
                          editingChecking: false,
                        }));
                      }
                    }}
                    className="w-full bg-zinc-950 text-zinc-100 rounded px-1.5 py-0.5 text-[11px] border border-white/10 focus:outline-none tabular-nums"
                    placeholder="0.00"
                    autoFocus
                    disabled={updateCheckingMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={handleSaveChecking}
                    disabled={updateCheckingMutation.isPending}
                    className="btn-ghost-icon !p-1 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
                    title="Save checking balance (Enter)"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActive((prev) => ({
                        ...prev,
                        editingChecking: false,
                      }))
                    }
                    disabled={updateCheckingMutation.isPending}
                    className="btn-ghost-icon !p-1 hover:text-zinc-300"
                    title="Cancel (Esc)"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="truncate tabular-nums">
                    Checking:{" "}
                    <span className="text-zinc-300 font-medium">
                      {formatCurrency(checkingBalance)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setActive((prev) => ({
                        ...prev,
                        editingChecking: true,
                        checkingInput: checkingBalance.toFixed(2),
                      }))
                    }
                    className="text-zinc-500 hover:text-zinc-200 transition-colors p-0.5 cursor-pointer"
                    title="Edit Primary Checking balance"
                  >
                    <Pencil size={11} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Total Savings
            </p>
            <p className="text-2xl font-semibold tracking-tight text-emerald-400 tabular-nums">
              {formatCurrency(totalSavings)}
            </p>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Active Debt
            </p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-200 tabular-nums">
              {formatCurrency(totalDebt)}
            </p>
          </div>

          <div className="glass-panel p-5">
            <p className="text-xs font-medium text-zinc-500 mb-1">
              Card Balances
            </p>
            <p className="text-2xl font-semibold tracking-tight text-zinc-200 tabular-nums">
              {formatCurrency(totalCC)}
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
              onBulkDelete={(ids) =>
                openModal("delete", { toDeleteIds: ids })
              }
            />
            {spendingData && spendingData.length > 0 && (
              <SpendingChartCard data={spendingData} />
            )}
          </div>

          <div className="lg:col-span-5 space-y-6">
            <FinancialAdviceCard
              advice={advice}
              structured={structuredAdvice}
              onGetAdvice={handleGetAdvice}
              isLoading={adviceLoading}
              onOpenGemModal={() => openModal("geminiModal")}
            />
            <CreditCardSummary creditCards={creditCardSummary} />
            <ProgressSection
              debtSummary={debtSummary}
              savingsSummary={savingsSummary}
              onPayDebt={(id) => openModal("debt", { debtId: id, debt: debtSummary?.find((d) => d.id === id) })}
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
        debt={active.debt}
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
        itemType={
          Array.isArray(active.toDeleteIds) && active.toDeleteIds.length > 0
            ? "selected bills"
            : "bill"
        }
        itemName={
          Array.isArray(active.toDeleteIds) && active.toDeleteIds.length > 0
            ? `${active.toDeleteIds.length} bill${
                active.toDeleteIds.length === 1 ? "" : "s"
              }`
            : ""
        }
      />
      <GeminiGemModal
        isOpen={modals.geminiModal}
        onClose={() => closeModal("geminiModal")}
      />
    </div>
  );
};

export default DashboardPage;
