import { useState, useEffect } from "react";
import dashboardService from "../services/dashboardService";
import MonthlySummary from "../components/Dashboard/MonthlySummary";
import SpendingChartCard from "../components/Dashboard/SpendingChartCard";
import TransactionList from "../components/Dashboard/TransactionList";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import SpendingTrendsChart from "../components/Dashboard/SpendingTrendsChart";
import CategoryDetailModal from "../components/Modals/CategoryDetailModal"; // Import the new modal

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

  // --- NEW State for the Category Detail Modal ---
  const [isCategoryModalOpen, setCategoryModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(null);
  const [categoryTransactions, setCategoryTransactions] = useState([]);
  // --- END NEW State ---

  const [sortConfig, setSortConfig] = useState({
    key: "due_date",
    direction: "ASC",
  });

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, spendingRes, expensesRes, trendsRes] =
        await Promise.all([
          dashboardService.fetchDashboard(
            selectedDate.year,
            selectedDate.month
          ),
          dashboardService.fetchSpendingSummary(
            selectedDate.year,
            selectedDate.month
          ),
          dashboardService.fetchMonthlyExpenses(
            selectedDate.year,
            selectedDate.month,
            sortConfig.key,
            sortConfig.direction
          ),
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
  };

  // Refetch data when sortConfig changes
  useEffect(() => {
    fetchReportData();
  }, [selectedDate, sortConfig]);

  const handleDateChange = (e) => {
    setSelectedDate((prev) => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value),
    }));
  };

  const handleSort = (key) => {
    let direction = "ASC";
    if (sortConfig.key === key && sortConfig.direction === "ASC") {
      direction = "DESC";
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = async () => {
    await dashboardService.deleteBill(activeExpenseId);
    setDeleteModalOpen(false);
    fetchReportData();
  };

  // --- NEW Function to handle chart clicks ---
  const handleCategoryClick = async (category) => {
    try {
      const transactions = await dashboardService.fetchExpensesByCategory(
        selectedDate.year,
        selectedDate.month,
        category
      );
      setCategoryTransactions(transactions);
      setActiveCategory(category);
      setCategoryModalOpen(true);
    } catch (error) {
      console.error(`Error fetching transactions for ${category}:`, error);
    }
  };
  // --- END NEW Function ---

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <h1 className="text-2xl font-bold text-white mb-4">Monthly Reports</h1>

      {/* Date Selector */}
      <div className="flex gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Month</label>
          <select
            name="month"
            value={selectedDate.month}
            onChange={handleDateChange}
            className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-indigo-500"
          >
            {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => (
              <option key={i+1} value={i+1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Year</label>
          <select
            name="year"
            value={selectedDate.year}
            onChange={handleDateChange}
            className="bg-gray-700 text-white text-sm rounded px-3 py-2 border border-gray-600 focus:outline-none focus:border-indigo-500"
          >
            {[2023, 2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white">Loading report...</div>
      ) : reportData ? (
        <div className="space-y-6">
          <SpendingTrendsChart data={trendsData} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MonthlySummary summary={reportData.monthlySummary} />
            <SpendingChartCard
              data={spendingData}
              onCategoryClick={handleCategoryClick}
            />
            <div className="md:col-span-2">
              {/* Pass sort config and handler to the transaction list */}
              <TransactionList
                transactions={monthlyExpenses}
                sortConfig={sortConfig}
                onSort={handleSort}
                onDelete={(id) => {
                  setActiveExpenseId(id);
                  setDeleteModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-center text-white">
          Could not load data for the selected period.
        </p>
      )}

      {/* Add the new modal to the page */}
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
