import { useState, useEffect, useCallback } from "react";
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

  // --- Optional Budget Limits (localStorage) ---
  const [budgets, setBudgets] = useState(() => {
    try { return JSON.parse(localStorage.getItem("fintrack_budgets") || "{}"); }
    catch { return {}; }
  });
  const [editingBudget, setEditingBudget] = useState(null); // category name or null
  const [budgetInput, setBudgetInput] = useState("");

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
      const [dashboardRes, spendingRes, expensesRes, trendsRes] = await Promise.all([
        dashboardService.fetchDashboard(selectedDate.year, selectedDate.month),
        dashboardService.fetchSpendingSummary(selectedDate.year, selectedDate.month),
        dashboardService.fetchMonthlyExpenses(selectedDate.year, selectedDate.month, sortConfig.key, sortConfig.direction),
        dashboardService.fetchTrends(),
      ]);
      setReportData(dashboardRes);
      setSpendingData(spendingRes);
      setMonthlyExpenses(expensesRes);
      setTrendsData(trendsRes);
    } catch (err) {
      console.error("Error fetching report data:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, sortConfig]);

  useEffect(() => { fetchReportData(); }, [fetchReportData]);

  const handleDateChange = (e) => {
    setSelectedDate((prev) => ({ ...prev, [e.target.name]: parseInt(e.target.value) }));
  };

  const handleSort = (key) => {
    let direction = "ASC";
    if (sortConfig.key === key && sortConfig.direction === "ASC") direction = "DESC";
    setSortConfig({ key, direction });
  };

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

  // Derived stats
  const income = reportData?.monthlySummary?.totalIncome || 0;
  const spending = reportData?.monthlySummary?.totalSpending || 0;
  const savingsRate = income > 0 ? (((income - spending) / income) * 100).toFixed(1) : null;
  const spendingRate = income > 0 ? ((spending / income) * 100).toFixed(1) : null;

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <h1 className="text-2xl font-bold text-white mb-4">Monthly Reports</h1>

      {/* Stats bar */}
      {!loading && reportData && income > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Income</p>
            <p className="text-lg font-bold text-green-400">${income.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Spent</p>
            <p className="text-lg font-bold text-red-400">${spending.toFixed(2)}</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Savings Rate</p>
            <p className={`text-lg font-bold ${parseFloat(savingsRate) >= 20 ? "text-green-400" : parseFloat(savingsRate) >= 0 ? "text-yellow-400" : "text-red-400"}`}>
              {savingsRate}%
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-xs text-gray-400">Spending Rate</p>
            <p className={`text-lg font-bold ${parseFloat(spendingRate) <= 70 ? "text-green-400" : parseFloat(spendingRate) <= 90 ? "text-yellow-400" : "text-red-400"}`}>
              {spendingRate}%
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-white">Loading report...</div>
      ) : reportData ? (
        <div className="space-y-6">
          {/* 6-month trend — always rolling, no date filter */}
          <SpendingTrendsChart data={trendsData} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Month-over-month comparison */}
            {(() => {
              const prev = reportData.monthlySummary?.previousMonthNetFlow ?? 0;
              const curr = reportData.monthlySummary?.netFlow ?? 0;
              const netChange = curr - prev;
              const arrow = netChange >= 0 ? "▲" : "▼";
              const changeColor = netChange >= 0 ? "text-green-400" : "text-red-400";
              return (
                <div className="bg-gray-800 p-4 rounded-lg flex flex-col gap-4">
                  <h2 className="text-sm font-semibold text-gray-400">THIS MONTH vs LAST MONTH</h2>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">Income</p>
                      <p className="text-2xl font-bold text-green-400">${income.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">Last month net</p>
                      <p className={`text-lg font-semibold ${prev >= 0 ? "text-green-400" : "text-red-400"}`}>${prev.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-xs text-gray-400">Spent</p>
                      <p className="text-2xl font-bold text-red-400">${spending.toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400">This month net</p>
                      <p className={`text-lg font-semibold ${curr >= 0 ? "text-green-400" : "text-red-400"}`}>${curr.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="border-t border-gray-700 pt-3">
                    <p className="text-xs text-gray-400 mb-1">Net flow vs last month</p>
                    <p className={`text-xl font-bold ${changeColor}`}>
                      {arrow} ${Math.abs(netChange).toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {netChange >= 0 ? "Better than last month 🎉" : "Worse than last month — review spending"}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Spending summary with optional budget limits */}
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-semibold text-gray-400">SPENDING BY CATEGORY</h2>
                <span className="text-xs text-gray-400 italic">Click a segment to drill down</span>
              </div>
              <SpendingChartCard data={spendingData} onCategoryClick={handleCategoryClick} />

              {/* Budget limits section */}
              {spendingData.length > 0 && (
                <div className="mt-4 border-t border-gray-700 pt-3">
                  <p className="text-xs text-gray-400 mb-2 font-semibold">OPTIONAL BUDGET LIMITS</p>
                  <div className="space-y-1.5">
                    {spendingData.map((cat) => {
                      const limit = budgets[cat.name];
                      const over = limit && cat.value > limit;
                      return (
                        <div key={cat.name} className="flex items-center justify-between text-xs">
                          <span className="text-gray-300 w-32 truncate">{cat.name}</span>
                          <span className={`font-semibold ${over ? "text-red-400" : "text-gray-400"}`}>
                            ${cat.value.toFixed(2)}
                            {limit && <span className="text-gray-400"> / ${limit.toFixed(2)}</span>}
                            {over && <span className="ml-1 bg-red-900 text-red-300 text-[10px] px-1.5 py-0.5 rounded-full">Over</span>}
                          </span>
                          {editingBudget === cat.name ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                placeholder="limit"
                                value={budgetInput}
                                onChange={(e) => setBudgetInput(e.target.value)}
                                className="w-20 bg-gray-700 text-white rounded px-2 py-0.5 text-xs border border-gray-600 focus:outline-none"
                                autoFocus
                              />
                              <button onClick={() => saveBudget(cat.name)} className="text-green-400 hover:text-green-300">✓</button>
                              <button onClick={() => setEditingBudget(null)} className="text-gray-500 hover:text-gray-300">✗</button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <button
                                onClick={() => { setEditingBudget(cat.name); setBudgetInput(limit || ""); }}
                                className="text-gray-600 hover:text-indigo-400 transition-colors"
                                title="Set budget limit"
                              >
                                {limit ? "✏️" : "+ limit"}
                              </button>
                              {limit && (
                                <button onClick={() => removeBudget(cat.name)} className="text-gray-600 hover:text-red-400 transition-colors" title="Remove limit">✗</button>
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
              {/* Date filter — scoped to the Expenses list only */}
              <div className="flex items-center gap-4 mb-3 bg-gray-800 px-4 py-3 rounded-lg">
                <span className="text-xs text-gray-400 font-semibold">FILTER EXPENSES:</span>
                <div>
                  <select
                    name="month"
                    value={selectedDate.month}
                    onChange={handleDateChange}
                    className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-indigo-500"
                  >
                    {MONTHS.map((m, i) => (
                      <option key={i+1} value={i+1}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <select
                    name="year"
                    value={selectedDate.year}
                    onChange={handleDateChange}
                    className="bg-gray-700 text-white text-sm rounded px-3 py-1.5 border border-gray-600 focus:outline-none focus:border-indigo-500"
                  >
                    {[2023, 2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
                <span className="text-xs text-gray-600">The trends chart always shows the last 6 months.</span>
              </div>
              <TransactionList
                transactions={monthlyExpenses}
                sortConfig={sortConfig}
                onSort={handleSort}
                onDelete={(id) => { setActiveExpenseId(id); setDeleteModalOpen(true); }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-white">Could not load data for the selected period.</p>
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
