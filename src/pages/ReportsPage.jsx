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
            selectedDate.month
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

  useEffect(() => {
    fetchReportData();
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate((prev) => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value),
    }));
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

      {/* Date Selector remains the same */}
      <div className="flex gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
        {/* ... (existing date selector code) */}
      </div>

      {loading ? (
        <div className="text-center text-white">Loading report...</div>
      ) : reportData ? (
        <div className="space-y-6">
          <SpendingTrendsChart data={trendsData} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MonthlySummary summary={reportData.monthlySummary} />
            {spendingData.length > 0 ? (
              // Pass the new click handler to the chart
              <SpendingChartCard
                data={spendingData}
                onCategoryClick={handleCategoryClick}
              />
            ) : (
              <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center">
                <p className="text-gray-400">
                  No spending data for this month.
                </p>
              </div>
            )}
            <div className="md:col-span-2">
              <TransactionList
                transactions={monthlyExpenses}
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
