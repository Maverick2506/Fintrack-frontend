import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
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
import { openAskFinTrack, isAskFinTrackOpen } from "../utils/askFinTrack";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
import { formatCurrency, formatShortDate } from "../utils/formatUtils";
import ForecastChartCard from "../components/Dashboard/ForecastChartCard";

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

  const spendingData = useMemo(() => dashboardData?.spendingSummary || [], [dashboardData?.spendingSummary]);
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

  const selectedMonthStr = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  const { data: serverBudgets = [] } = useQuery({
    queryKey: ["budgets", selectedMonthStr],
    queryFn: () => dashboardService.fetchBudgets(selectedMonthStr),
  });

  const { data: netWorthHistory } = useQuery({
    queryKey: ["netWorthHistory", 12],
    queryFn: () => dashboardService.fetchNetWorthHistory(12),
  });

  const { data: forecast } = useQuery({
    queryKey: ["forecast"],
    queryFn: () => dashboardService.fetchForecast(60),
  });

  const { data: estimateIncomeSetting } = useQuery({
    queryKey: ["forecast-estimate-income-setting"],
    queryFn: () => dashboardService.fetchForecastEstimateIncomeSetting(),
  });

  const updateEstimateIncomeMutation = useMutation({
    mutationFn: (enabled) => dashboardService.updateForecastEstimateIncomeSetting(enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecast"] });
      queryClient.invalidateQueries({ queryKey: ["forecast-estimate-income-setting"] });
    },
  });

  const updateForecastBufferMutation = useMutation({
    mutationFn: (newBuffer) => dashboardService.updateForecastBuffer(newBuffer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecast"] });
    },
  });

  const topBudgets = useMemo(() => {
    if (!serverBudgets.length || !spendingData.length) return [];
    const budgetMap = new Map(serverBudgets.map((b) => [b.category, b.monthlyLimit]));

    const items = [];
    for (const item of spendingData) {
      const limit = budgetMap.get(item.name);
      if (limit && limit > 0) {
        const spent = Number(item.value) || 0;
        const pct = (spent / limit) * 100;
        items.push({
          category: item.name,
          spent,
          limit,
          pct,
        });
      }
    }

    items.sort((a, b) => b.pct - a.pct);
    return items.slice(0, 3);
  }, [serverBudgets, spendingData]);
  const { data: healthData } = useQuery({
    queryKey: ["health"],
    queryFn: () => dashboardService.fetchHealth(),
    staleTime: 60000,
  });
  const isAiAvailable = healthData?.ai ?? true;

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
      if (anyModalOpen || isAskFinTrackOpen()) return;
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
    queryClient.invalidateQueries({ queryKey: ["budgets"] });
    queryClient.invalidateQueries({ queryKey: ["forecast"] });
    queryClient.invalidateQueries({ queryKey: ["netWorthHistory"] });
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

  const handleGetAdvice = async (options = {}) => {
    setAdviceLoading(true);
    try {
      const adviceResponse = await dashboardService.getFinancialAdvice(options);
      setAdvice(adviceResponse.advice);
      localStorage.setItem("fintrack_advice", adviceResponse.advice);
      if (adviceResponse.structured) {
        const structuredWithDate = {
          ...adviceResponse.structured,
          updatedAt: adviceResponse.updatedAt || new Date().toISOString(),
        };
        setStructuredAdvice(structuredWithDate);
        localStorage.setItem(
          "fintrack_structured_advice",
          JSON.stringify(structuredWithDate)
        );
      }
    } catch (err) {
      const msg =
        err.response?.data?.error ||
        "Sorry, I could not get any advice at the moment.";
      setAdvice(msg);
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
  const forecastBuffer = forecast?.buffer ?? 200;
  const forecastLowestBalance = forecast?.lowestPoint?.balance ?? 0;
  const forecastIsLow = forecastLowestBalance < forecastBuffer;
  const isNextPaydayEstimated = Boolean(
    forecast?.days?.find((d) => d.date === forecast?.nextPayday)?.items?.some((it) => it.estimated)
  );

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
        {/* Mobile KPI Layout (M4) */}
        <div className="sm:hidden space-y-2.5 mb-5">
          {/* Big Safe to Spend Tile */}
          <div className="glass-panel p-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-zinc-400">Safe to Spend</p>
              {forecastIsLow ? (
                <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                  Below buffer
                </span>
              ) : (
                <span className="text-[11px] text-zinc-400">
                  {forecast?.nextPayday
                    ? `until ${formatShortDate(forecast.nextPayday)} (${isNextPaydayEstimated ? "est." : "payday"})`
                    : "next 60 days"}
                </span>
              )}
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <p
                className={`text-2xl font-bold tracking-tight tabular-nums ${
                  forecastIsLow ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(forecast?.safeToSpend ?? 0)}
              </p>
              <div className="text-[11px] text-zinc-500 tabular-nums">
                Low {formatCurrency(forecastLowestBalance, { maximumFractionDigits: 0 })} · {formatShortDate(forecast?.lowestPoint?.date)}
              </div>
            </div>
          </div>

          {/* 2x2 Compact Metric Grid (~70px cards) */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* 1. Net Worth */}
            <div className="glass-panel p-3">
              <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Net Worth</p>
              <p className={`text-base font-semibold tabular-nums truncate ${positiveNetWorth ? "text-zinc-100" : "text-rose-400"}`}>
                {formatCurrency(netWorth, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                Checking: {formatCurrency(checkingBalance, { maximumFractionDigits: 0 })}
              </p>
            </div>

            {/* 2. Total Savings */}
            <div className="glass-panel p-3">
              <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Total Savings</p>
              <p className="text-base font-semibold text-emerald-400 tabular-nums truncate">
                {formatCurrency(totalSavings, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {(savingsSummary || []).length} active goals
              </p>
            </div>

            {/* 3. Active Debt */}
            <div className="glass-panel p-3">
              <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Active Debt</p>
              <p className="text-base font-semibold text-zinc-200 tabular-nums truncate">
                {formatCurrency(totalDebt, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {(debtSummary || []).filter((d) => (parseFloat(d.initialBalance) || 0) > 0).length} accounts
              </p>
            </div>

            {/* 4. Card Balances */}
            <div className="glass-panel p-3">
              <p className="text-[11px] font-medium text-zinc-500 mb-0.5">Card Balances</p>
              <p className="text-base font-semibold text-zinc-200 tabular-nums truncate">
                {formatCurrency(totalCC, { maximumFractionDigits: 0 })}
              </p>
              <p className="text-[10px] text-zinc-500 truncate mt-0.5">
                {(creditCardSummary || []).length} cards
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Bento Strip */}
        <div className="hidden sm:grid sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* Safe to Spend Tile (Phase E) */}
          <div className="glass-panel p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-zinc-500">
                  Safe to Spend
                </p>
                {forecastIsLow && (
                  <span className="text-[10px] font-medium text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                    Below buffer
                  </span>
                )}
              </div>
              <p
                className={`text-2xl font-semibold tracking-tight tabular-nums ${
                  forecastIsLow ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {formatCurrency(forecast?.safeToSpend ?? 0)}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 truncate">
                {forecast?.nextPayday
                  ? `until ${formatShortDate(forecast.nextPayday)} (${isNextPaydayEstimated ? "est. payday" : "payday"})`
                  : "for next 60 days"}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-white/[0.06] text-[11px] text-zinc-500 truncate">
              <span>
                Lowest:{" "}
                <span
                  className={
                    forecastIsLow
                      ? "text-rose-400 font-medium"
                      : "text-zinc-300 font-medium"
                  }
                >
                  {formatCurrency(forecastLowestBalance)}
                </span>
                {forecast?.lowestPoint?.date && (
                  <span> on {formatShortDate(forecast.lowestPoint.date)}</span>
                )}
              </span>
            </div>
          </div>
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
              <div className="mt-1 text-[11px] tabular-nums">
                {netWorthHistory?.change30Days ? (
                  <span
                    className={
                      netWorthHistory.change30Days.absolute >= 0
                        ? "text-emerald-400 font-medium"
                        : "text-rose-400 font-medium"
                    }
                  >
                    {netWorthHistory.change30Days.absolute >= 0 ? "+" : ""}
                    {formatCurrency(netWorthHistory.change30Days.absolute)}
                    {netWorthHistory.change30Days.percentage !== null &&
                      ` (${netWorthHistory.change30Days.percentage >= 0 ? "+" : ""}${netWorthHistory.change30Days.percentage.toFixed(1)}%)`}
                    <span className="text-zinc-500 font-normal"> vs 30d ago</span>
                  </span>
                ) : (
                  <span className="text-zinc-500 font-normal">
                    Tracking since Oct 2026
                  </span>
                )}
              </div>
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
          <div className="lg:col-span-7 flex flex-col gap-6">
            <MonthlySummary summary={monthlySummary} monthLabel={MONTH_NAMES[selectedMonth - 1]} />
            <UpcomingBills
              bills={upcomingBills}
              onMarkAsPaid={handleMarkAsPaid}
              onEdit={(bill) => openModal("transaction", { toEdit: bill })}
              onDelete={(billId) => openModal("delete", { toDelete: billId })}
              onBulkDelete={(ids) =>
                openModal("delete", { toDeleteIds: ids })
              }
            />
            {topBudgets.length > 0 && (
              <div className="glass-panel p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                    Category Budgets
                  </p>
                  <Link
                    to="/reports"
                    className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    View all in Reports →
                  </Link>
                </div>
                <div className="space-y-3">
                  {topBudgets.map((b) => {
                    const isOver = b.pct >= 100;
                    const isWarning = b.pct >= 80 && !isOver;
                    const statusColor = isOver
                      ? "text-rose-400"
                      : isWarning
                      ? "text-amber-400"
                      : "text-emerald-400";
                    const barColor = isOver
                      ? "bg-rose-500"
                      : isWarning
                      ? "bg-amber-400"
                      : "bg-emerald-400";

                    return (
                      <div key={b.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs tabular-nums">
                          <span className="text-zinc-300 font-medium truncate max-w-[140px]">
                            {b.category}
                          </span>
                          <span className="text-zinc-400">
                            <span className={statusColor}>
                              {formatCurrency(b.spent)}
                            </span>
                            <span className="text-zinc-500"> / {formatCurrency(b.limit)}</span>
                            <span
                              className={`ml-1.5 text-[11px] font-medium ${statusColor}`}
                            >
                              ({b.pct.toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                            style={{
                              width: `${Math.min(b.pct, 100).toFixed(1)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            <ForecastChartCard
              forecast={forecast}
              onUpdateBuffer={(b) => updateForecastBufferMutation.mutateAsync(b)}
              isUpdatingBuffer={updateForecastBufferMutation.isPending}
              estimateIncomeEnabled={estimateIncomeSetting?.enabled ?? true}
              onToggleEstimateIncome={(val) => updateEstimateIncomeMutation.mutateAsync(val)}
              isUpdatingEstimateIncome={updateEstimateIncomeMutation.isPending}
            />
            {spendingData && spendingData.length > 0 && (
              <div className="hidden md:block">
                <SpendingChartCard data={spendingData} />
              </div>
            )}
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <FinancialAdviceCard
              advice={advice}
              structured={structuredAdvice}
              onGetAdvice={handleGetAdvice}
              isLoading={adviceLoading}
              onOpenGemModal={() => openModal("geminiModal")}
              onOpenChat={openAskFinTrack}
              isAiAvailable={isAiAvailable}
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
