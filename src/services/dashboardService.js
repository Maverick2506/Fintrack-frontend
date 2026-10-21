import axios from "axios";
import toast from "react-hot-toast";
import { getToken, isLoggedIn, logout } from "../utils/auth";
import { queryClient } from "../utils/queryClient";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    if (!isLoggedIn()) {
      logout();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
      return Promise.reject(new axios.Cancel("Session expired"));
    }
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      logout();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

/**
 * CRITICAL ARCHITECTURAL RULE: handleRequest is ONLY for state-mutating write operations (POST, PUT, DELETE).
 * NEVER wrap GET read requests in handleRequest, as handleRequest calls queryClient.invalidateQueries(),
 * which triggers an endless request loop when integrated with React Query.
 */
const handleRequest = async (
  requestPromise,
  successMessage,
  shouldInvalidate = true
) => {
  try {
    const response = await requestPromise;
    if (successMessage) {
      toast.success(successMessage);
    }
    if (shouldInvalidate) {
      queryClient.invalidateQueries();
    }
    return response.data;
  } catch (error) {
    if (axios.isCancel(error) || error.response?.status === 401) {
      throw error;
    }
    console.error("API Error:", error);
    toast.error(
      error.response?.data?.error || "An unexpected error occurred."
    );
    throw error;
  }
};

const dashboardService = {
  fetchDashboard: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    return api.get(`/dashboard?${params.toString()}`).then((res) => res.data);
  },

  fetchSpendingSummary: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    return api
      .get(`/spending-summary?${params.toString()}`)
      .then((res) => res.data);
  },

  fetchTrends: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    const qs = params.toString();
    return api.get(`/trends${qs ? `?${qs}` : ""}`).then((res) => res.data);
  },

  fetchMonthlyExpenses: async (year, month, sortBy, sortOrder) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    if (sortBy) params.append("sortBy", sortBy);
    if (sortOrder) params.append("sortOrder", sortOrder);
    return api
      .get(`/expenses/monthly?${params.toString()}`)
      .then((res) => res.data);
  },

  fetchDebts: async () => {
    return api.get("/debts").then((res) => res.data);
  },

  fetchSavingsGoals: async () => {
    return api.get("/savings-goals").then((res) => res.data);
  },

  fetchCreditCards: async () => {
    return api.get("/credit-cards").then((res) => res.data);
  },

  addCreditCard: async (cardData) => {
    return handleRequest(
      api.post("/credit-cards", cardData),
      "Credit card added!"
    );
  },

  payCreditCard: async (cardId, paymentData) => {
    return handleRequest(
      api.post(`/credit-cards/${cardId}/pay`, paymentData),
      "Card payment successful!"
    );
  },

  deleteCreditCard: async (cardId) => {
    return handleRequest(
      api.delete(`/credit-cards/${cardId}`),
      "Credit card deleted."
    );
  },

  addDebt: async (debtData) => {
    return handleRequest(
      api.post("/debts", debtData),
      "Debt added successfully!"
    );
  },

  addSavingsGoal: async (goalData) => {
    return handleRequest(
      api.post("/savings-goals", goalData),
      "Savings goal added!"
    );
  },

  markBillAsPaid: async (billId) => {
    return handleRequest(
      api.put(`/expenses/${billId}`, { is_paid: true }),
      "Bill marked as paid!"
    );
  },

  deleteBill: async (billId) => {
    return handleRequest(
      api.delete(`/expenses/${billId}`),
      "Transaction deleted."
    );
  },

  deleteDebt: async (debtId) => {
    return handleRequest(
      api.delete(`/debts/${debtId}`),
      "Debt deleted successfully."
    );
  },

  deleteSavingsGoal: async (goalId) => {
    return handleRequest(
      api.delete(`/savings-goals/${goalId}`),
      "Savings goal deleted."
    );
  },

  saveTransaction: async (transaction, isEditing) => {
    const isExpense = !transaction.payment_date;
    const endpoint = isEditing
      ? `/expenses/${transaction.id}`
      : isExpense
      ? `/expenses`
      : `/paycheques`;
    const request = isEditing
      ? api.put(endpoint, transaction)
      : api.post(endpoint, transaction);
    return handleRequest(request, "Transaction saved!");
  },

  addExpense: async (expenseData) => {
    return handleRequest(
      api.post("/expenses", expenseData),
      null
    );
  },

  addPaycheque: async (paychequeData) => {
    return handleRequest(
      api.post("/paycheques", paychequeData),
      null
    );
  },

  getFinancialAdvice: async (dashboardData) => {
    return handleRequest(
      api.post(`/financial-advice`, dashboardData),
      null,
      false
    );
  },

  categorizeExpense: async (name) => {
    return handleRequest(
      api.post(`/categorize-expense`, { name }),
      null,
      false
    );
  },

  payDebt: async (debtId, paymentData) => {
    return handleRequest(
      api.post(`/debts/${debtId}/pay`, paymentData),
      "Debt payment successful!"
    );
  },

  contributeToSavingsGoal: async (goalId, contributionData) => {
    return handleRequest(
      api.post(`/savings-goals/${goalId}/contribute`, contributionData),
      "Contribution successful!"
    );
  },

  fetchExpensesByCategory: async (year, month, category) => {
    const params = new URLSearchParams({ year, month, category });
    return api
      .get(`/expenses/category?${params.toString()}`)
      .then((res) => res.data);
  },

  updateDebt: async (id, debtData) => {
    return handleRequest(
      api.put(`/debts/${id}`, debtData),
      "Debt updated successfully!"
    );
  },

  updateSavingsGoal: async (id, goalData) => {
    return handleRequest(
      api.put(`/savings-goals/${id}`, goalData),
      "Savings goal updated!"
    );
  },

  updateCreditCard: async (id, cardData) => {
    return handleRequest(
      api.put(`/credit-cards/${id}`, cardData),
      "Credit card updated!"
    );
  },

  fetchLedger: async () => {
    return api.get("/expenses/all").then((res) => res.data);
  },

  fetchSubscriptions: async () => {
    return api.get("/subscriptions").then((res) => res.data);
  },

  cancelSubscription: async (id) => {
    return handleRequest(
      api.post(`/subscriptions/${id}/cancel`),
      "Subscription cancelled (future recurring occurrences stopped)."
    );
  },

  updateCheckingBalance: async (balance) => {
    return handleRequest(
      api.put("/checking", { balance }),
      "Checking balance updated!"
    );
  },

  bulkDeleteTransactions: async (ids) => {
    return handleRequest(
      api.post("/expenses/bulk-delete", { ids }),
      `${ids.length} transaction${ids.length === 1 ? "" : "s"} deleted.`
    );
  },

  getGeminiLiveConfig: async () => {
    return api.get("/export/gemini-config").then((res) => res.data);
  },

  regenerateFeedKey: async () => {
    return handleRequest(
      api.post("/export/regenerate-key"),
      "New secret feed key generated!"
    );
  },

  fetchBudgets: async (month) => {
    const url = month ? `/budgets?month=${encodeURIComponent(month)}` : "/budgets";
    const data = await api.get(url).then((res) => res.data);

    // One-time automatic migration from localStorage if server has no budgets
    if (
      Array.isArray(data) &&
      data.length === 0 &&
      localStorage.getItem("fintrack_budgets_migrated") !== "1"
    ) {
      try {
        const raw = localStorage.getItem("fintrack_budgets");
        if (raw) {
          const localBudgets = JSON.parse(raw);
          const entries = Object.entries(localBudgets);
          if (entries.length > 0) {
            for (const [cat, limit] of entries) {
              const val = parseFloat(limit);
              if (!isNaN(val) && val > 0) {
                await api.put(`/budgets/${encodeURIComponent(cat)}`, {
                  monthlyLimit: val,
                });
              }
            }
            localStorage.setItem("fintrack_budgets_migrated", "1");
            return api.get(url).then((res) => res.data);
          }
        }
        localStorage.setItem("fintrack_budgets_migrated", "1");
      } catch (err) {
        console.error("Budget migration error:", err);
      }
    }
    return data;
  },

  saveBudget: async (category, monthlyLimit, rollover = false) => {
    return handleRequest(
      api.put(`/budgets/${encodeURIComponent(category)}`, {
        monthlyLimit,
        rollover,
      }),
      "Budget limit updated!"
    );
  },

  deleteBudget: async (category) => {
    return handleRequest(
      api.delete(`/budgets/${encodeURIComponent(category)}`),
      "Budget limit removed!"
    );
  },

  fetchForecast: async (days = 60) => {
    return api.get(`/forecast?days=${days}`).then((res) => res.data);
  },

  fetchForecastBuffer: async () => {
    return api.get("/settings/forecast-buffer").then((res) => res.data);
  },

  fetchForecastEstimateIncomeSetting: async () => {
    return api.get("/settings/forecast-estimate-income").then((res) => res.data);
  },

  updateForecastEstimateIncomeSetting: async (enabled) => {
    return handleRequest(
      api.put("/settings/forecast-estimate-income", { enabled }),
      "Forecast settings updated!"
    );
  },

  updateForecastBuffer: async (buffer) => {
    return handleRequest(
      api.put("/settings/forecast-buffer", { buffer }),
      "Forecast buffer updated!"
    );
  },
  fetchNetWorthHistory: async (months = 12) => {
    return api.get(`/net-worth-history?months=${months}`).then((res) => res.data);
  },
};

export default dashboardService;
