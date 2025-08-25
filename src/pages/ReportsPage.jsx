import { useState, useEffect } from "react";
import dashboardService from "../services/dashboardService";
import MonthlySummary from "../components/Dashboard/MonthlySummary";
import SpendingChartCard from "../components/Dashboard/SpendingChartCard";
import TransactionList from "../components/Dashboard/TransactionList";

const ReportsPage = () => {
  const [reportData, setReportData] = useState(null);
  const [spendingData, setSpendingData] = useState([]);
  const [monthlyExpenses, setMonthlyExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
  });

  useEffect(() => {
    const fetchReportData = async () => {
      setLoading(true);
      try {
        const [dashboardRes, spendingRes, expensesRes] = await Promise.all([
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
        ]);
        setReportData(dashboardRes);
        setSpendingData(spendingRes);
        setMonthlyExpenses(expensesRes);
      } catch (err) {
        console.error("Error fetching report data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, [selectedDate]);

  const handleDateChange = (e) => {
    setSelectedDate((prev) => ({
      ...prev,
      [e.target.name]: parseInt(e.target.value),
    }));
  };

  return (
    <div className="container mx-auto max-w-7xl p-4">
      <h1 className="text-2xl font-bold text-white mb-4">Monthly Reports</h1>

      {/* Date Selector */}
      <div className="flex gap-4 mb-6 bg-gray-800 p-4 rounded-lg">
        <div className="flex-1">
          <label
            htmlFor="month"
            className="block text-sm font-medium text-gray-300"
          >
            Month
          </label>
          <select
            name="month"
            id="month"
            value={selectedDate.month}
            onChange={handleDateChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString("default", { month: "long" })}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label
            htmlFor="year"
            className="block text-sm font-medium text-gray-300"
          >
            Year
          </label>
          <select
            name="year"
            id="year"
            value={selectedDate.year}
            onChange={handleDateChange}
            className="mt-1 block w-full bg-gray-700 border-gray-600 rounded-md shadow-sm text-white p-2"
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - i
            ).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-white">Loading report...</div>
      ) : reportData ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <MonthlySummary summary={reportData.monthlySummary} />
          {spendingData.length > 0 ? (
            <SpendingChartCard data={spendingData} />
          ) : (
            <div className="bg-gray-800 p-4 rounded-lg flex items-center justify-center">
              <p className="text-gray-400">No spending data for this month.</p>
            </div>
          )}
          <div className="md:col-span-2">
            <TransactionList transactions={monthlyExpenses} />
          </div>
        </div>
      ) : (
        <p className="text-center text-white">
          Could not load data for the selected period.
        </p>
      )}
    </div>
  );
};

export default ReportsPage;
