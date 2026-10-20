import { useState, useEffect, useCallback, useMemo } from "react";
import { Pencil, X, Check } from "lucide-react";
import dashboardService from "../services/dashboardService";
import SpendingChartCard from "../components/Dashboard/SpendingChartCard";
import TransactionList from "../components/Dashboard/TransactionList";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import SpendingTrendsChart from "../components/Dashboard/SpendingTrendsChart";
import CategoryDetailModal from "../components/Modals/CategoryDetailModal";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [spendingData, setSpendingData] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [trendsData, setTrendsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [activeExpenseId, setActiveExpenseId] = useState(null);
  const [selectedDate, setSelectedDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: "due_date", direction: "ASC" });

  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fintrack_budgets") || "{}"); }
    catch { return {}; }
  });
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");

  const currentYear = new Date().getFullYear();
  const availableYears = useMemo(() => {
    const start = 2023;
    const end = Math.max(currentYear + 2, 2027);
    const years = [];
    for (let y = start; y <= end; y++) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const saveBudget = (category) => {
    const val = parseFloat(budgetInput);
    if (!isNaN(val) && val > 0) {
      const updated = { ...budgets, [category]: val };
      setBudgets(updated);
      localStorage.setItem("fintrack_budgets", JSON.stringify(updated));
    }
    setEditingBudget(null);
    setBudgetInput("");
  };

  const removeBudget = (category) => {
    const updated = { ...budgets };
    delete updated[category];
    setBudgets(updated);
    localStorage.setItem("fintrack_budgets", JSON.stringify(updated));
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboardRes, expensesRes, trendsRes] = await Promise.all([
        dashboardService.fetchDashboard(selectedDate.year, selectedDate.month),
        dashboardService.fetchMonthlyExpenses(selectedDate.year, selectedDate.month),
        dashboardService.fetchTrends(selectedDate.year, selectedDate.month),
      ]);
      setReportData(dashboardRes);
      setSpendingData(dashboardRes?.spendingSummary || []);
      setMonthlyExpenses(expensesRes || []);
      setTrendsData(trendsRes || []);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  const handleDateChange = (e) => {
    setSelectedDate((prev) => ({ ...prev, [e.target.name]: parseInt(e.target.value) }));
  };

  const handleSort = (key) => {
    let direction = "ASC";
    if (sortConfig.key === key && sortConfig.direction === "ASC") direction = "DESC";
    setSortConfig({ key, direction });
  };

  const sortedMonthlyExpenses = useMemo(() => {
    if (!monthlyExpenses || monthlyExpenses.length === 0) return [];
    return [...monthlyExpenses].sort((a, b) => {
      let va = a[sortConfig.key] ?? a.date ?? a.due_date ?? "";
      let vb = b[sortConfig.key] ?? b.date ?? b.due_date ?? "";
      if (sortConfig.key === "due_date" || sortConfig.key === "date") {
        va = new Date(va).getTime();
        vb = new Date(vb).getTime();
      } else if (sortConfig.key === "amount") {
        va = parseFloat(va) || 0;
        vb = parseFloat(vb) || 0;
      } else if (typeof va === "string") {
        va = va.toLowerCase();
        vb = String(vb).toLowerCase();
      }
      if (va < vb) return sortConfig.direction === "ASC" ? -1 : 1;
      if (va > vb) return sortConfig.direction === "ASC" ? 1 : -1;
      return 0;
    });
  }, [monthlyExpenses, sortConfig]);

  const handleDelete = async () => {
    await dashboardService.deleteBill(activeExpenseId);
    setDeleteModalOpen(false);
    fetchReportData();
  };

  const handleCategoryClick = async (category) => {
    try {
      const transactions = await dashboardService.fetchExpensesByCategory(selectedDate.year, selectedDate.month, category);
      setCategoryTransactions(transactions);
      setActiveCategory(category);
      setCategoryModalOpen(true);
    } catch (error) {
      console.error(`Error fetching transactions for ${category}:`, error);
    }
  };

  const income = reportData?.monthlySummary?.totalIncome || 0;
  const spending = reportData?.monthlySummary?.totalSpending || 0;
  const savingsRate = income > 0 ? (((income - spending) / income) * 100).toFixed(1) : null;
  const spendingRate = income > 0 ? ((spending / income) * 100).toFixed(1) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Insights
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Monthly Analytics
          </h1>
        </div>

        {/* Date Filter moved to top header for instant period switching */}
        <div className="flex items-center gap-2">
          <select
            name="month"
            value={selectedDate.month}
            onChange={handleDateChange}
            className="bg-zinc-900 text-zinc-200 text-xs font-medium rounded-lg px-3 py-2 border border-white/[0.08] focus:outline-none focus:border-zinc-500"
          >
            {MONTHS.map((m, i) => (
              <option key={i + 1} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <select
            name="year"
            value={selectedDate.year}
            onChange={handleDateChange}
            className="bg-zinc-900 text-zinc-200 text-xs font-medium rounded-lg px-3 py-2 border border-white/[0.08] focus:outline-none focus:border-zinc-500"
          >
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && reportData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-panel p-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Income</p>
            <p className="text-xl font-semibold text-emerald-400 tabular-nums">
              ${income.toFixed(2)}
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Spent</p>
            <p className="text-xl font-semibold text-rose-400 tabular-nums">
              ${spending.toFixed(2)}
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Savings Rate</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                savingsRate === null
                  ? "text-zinc-500"
                  : parseFloat(savingsRate) >= 20
                  ? "text-emerald-400"
                  : parseFloat(savingsRate) >= 0
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {savingsRate !== null ? `${savingsRate}%` : "—"}
            </p>
          </div>
          <div className="glass-panel p-4">
            <p className="text-xs font-medium text-zinc-500 mb-1">Spending Rate</p>
            <p
              className={`text-xl font-semibold tabular-nums ${
                spendingRate === null
                  ? "text-zinc-500"
                  : parseFloat(spendingRate) <= 70
                  ? "text-emerald-400"
                  : parseFloat(spendingRate) <= 90
                  ? "text-amber-400"
                  : "text-rose-400"
              }`}
            >
              {spendingRate !== null ? `${spendingRate}%` : "—"}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-zinc-500 text-sm p-12">
          Loading analytics...
        </div>
      ) : reportData ? (
        <div className="space-y-6">
          <SpendingTrendsChart data={trendsData} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Month-over-month comparison */}
            {(() => {
              const prev = reportData.monthlySummary?.previousMonthNetFlow ?? 0;
              const curr = reportData.monthlySummary?.netFlow ?? 0;
              const netChange = curr - prev;
              const arrow = netChange >= 0 ? "▲" : "▼";
              const changeColor = netChange >= 0 ? "text-emerald-400" : "text-rose-400";
              const spentPct = income > 0 ? Math.min((spending / income) * 100, 100) : 0;
              const savedPct = income > 0 ? Math.max(100 - spentPct, 0) : 0;
              const srNum = parseFloat(savingsRate) || 0;
              const srColor = srNum >= 20 ? "#34d399" : srNum >= 10 ? "#fbbf24" : "#fb7185";
              return (
                <div className="glass-panel p-6 flex flex-col justify-between gap-5">
                  <div>
                    <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-5">
                      Month-over-Month Comparison
                    </h2>

                    <div className="grid grid-cols-2 gap-4 mb-5">
                      <div className="glass-card p-3.5">
                        <p className="text-xs text-zinc-500 mb-1">This Month Net</p>
                        <p
                          className={`text-xl font-semibold tabular-nums ${
                            curr >= 0 ? "text-zinc-100" : "text-rose-400"
                          }`}
                        >
                          ${curr.toFixed(2)}
                        </p>
                      </div>
                      <div className="glass-card p-3.5">
                        <p className="text-xs text-zinc-500 mb-1">Last Month Net</p>
                        <p
                          className={`text-xl font-semibold tabular-nums ${
                            prev >= 0 ? "text-zinc-300" : "text-rose-400"
                          }`}
                        >
                          ${prev.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {income > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-zinc-500 mb-1.5">Income Allocation</p>
                        <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-zinc-800">
                          <div
                            className="h-full bg-rose-400 transition-all duration-500"
                            style={{ width: `${spentPct.toFixed(1)}%` }}
                          />
                          <div
                            className="h-full bg-emerald-400 transition-all duration-500"
                            style={{ width: `${savedPct.toFixed(1)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[11px] mt-1.5 tabular-nums">
                          <span className="text-zinc-400">Spent {spentPct.toFixed(1)}%</span>
                          <span className="text-zinc-400">Saved {savedPct.toFixed(1)}%</span>
                        </div>
                      </div>
                    )}

                    {savingsRate !== null && (
                      <div className="mb-5">
                        <div className="flex justify-between items-center mb-1.5">
                          <p className="text-xs text-zinc-500">Savings Rate Health</p>
                          <span className="text-xs font-semibold tabular-nums" style={{ color: srColor }}>
                            {savingsRate}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(Math.max(0, srNum), 100)}%`, backgroundColor: srColor }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Budget compliance */}
                    <div>
                      <p className="text-xs text-zinc-500 mb-2">Budget Compliance</p>
                      {(() => {
                        const tracked = spendingData.filter((cat) => budgets[cat.name]);
                        if (tracked.length === 0) {
                          return (
                            <p className="text-xs text-zinc-500">
                              No category budget limits configured yet.
                            </p>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {tracked.map((cat) => {
                              const limit = budgets[cat.name];
                              const usedPct = Math.min((cat.value / limit) * 100, 100);
                              const isOver = cat.value > limit;
                              return (
                                <div key={cat.name}>
                                  <div className="flex justify-between text-xs mb-1 tabular-nums">
                                    <span className="text-zinc-300">{cat.name}</span>
                                    <span className={isOver ? "text-rose-400 font-medium" : "text-zinc-400"}>
                                      ${cat.value.toFixed(2)} / ${limit.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-500 ${
                                        isOver ? "bg-rose-400" : "bg-emerald-400"
                                      }`}
                                      style={{ width: `${usedPct.toFixed(1)}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06] pt-4 flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Net Delta vs. Prior Month</span>
                    <span className={`text-sm font-semibold tabular-nums ${changeColor}`}>
                      {arrow} ${Math.abs(netChange).toFixed(2)}
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Spending summary with optional budget limits */}
            <div className="space-y-4">
              <SpendingChartCard data={spendingData} onCategoryClick={handleCategoryClick} />

              {spendingData.length > 0 && (
                <div className="glass-panel p-5">
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">
                    Category Budget Limits
                  </p>
                  <div className="space-y-2">
                    {spendingData.map((cat) => {
                      const limit = budgets[cat.name];
                      const over = limit && cat.value > limit;
                      return (
                        <div key={cat.name} className="flex items-center justify-between text-xs py-1">
                          <span className="text-zinc-300 font-medium w-32 truncate">{cat.name}</span>
                          <span className={`tabular-nums ${over ? "text-rose-400 font-medium" : "text-zinc-400"}`}>
                            ${cat.value.toFixed(2)}
                            {limit && <span className="text-zinc-500"> / ${limit.toFixed(2)}</span>}
                          </span>
                          {editingBudget === cat.name ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="Limit"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                className="w-20 bg-zinc-950 text-zinc-100 rounded px-2 py-1 text-xs border border-white/10 focus:outline-none"
                                autoFocus
                              />
                              <button onClick={() => saveBudget(cat.name)} className="btn-ghost-icon !p-1 text-emerald-400">
                                <Check size={13} />
                              </button>
                              <button onClick={() => setEditingBudget(null)} className="btn-ghost-icon !p-1">
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingBudget(cat.name); setBudgetInput(limit || ""); }}
                                className="text-xs text-zinc-500 hover:text-zinc-200 transition-colors cursor-pointer"
                              >
                                {limit ? <Pencil size={12} /> : "+ Set limit"}
                              </button>
                              {limit && (
                                <button
                                  onClick={() => removeBudget(cat.name)}
                                  className="btn-ghost-icon !p-1 hover:text-rose-400"
                                >
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <TransactionList
                transactions={sortedMonthlyExpenses}
                sortConfig={sortConfig}
                onSort={handleSort}
                onDelete={(id) => { setActiveExpenseId(id); setDeleteModalOpen(true); }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-zinc-500 text-sm">Could not load data for the selected period.</p>
      )}

      <CategoryDetailModal
        isOpen={isCategoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={activeCategory}
        transactions={categoryTransactions}
      />
      <ConfirmDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        itemType="expense"
      />
    </div>
  );
};

export default ReportsPage;
