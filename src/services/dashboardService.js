import axios from "axios";
import toast from "react-hot-toast";
import { getToken, isLoggedIn, logout } from "../utils/auth";
import { queryClient } from "../utils/queryClient";
import { isDuplicateClientRefError, isTimeoutError } from "../utils/pendingSubmission";
import { buildLoginPath } from "../utils/quickAddLink";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Render's free instance takes 30-60s to wake from sleep, so allow a cold start to finish (N3)
const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
});

api.interceptors.request.use(
  (config) => {
    if (!isLoggedIn()) {
      logout();
      if (window.location.pathname !== "/login") {
        window.location.replace(buildLoginPath(window.location.pathname, window.location.search));
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
        window.location.replace(buildLoginPath(window.location.pathname, window.location.search));
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
  shouldInvalidate = true,
  showErrorToast = true
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
    // showErrorToast can also be a function of the error, to skip the toast for some errors only
    if (
      typeof showErrorToast === "function"
        ? showErrorToast(error)
        : showErrorToast
    ) {
      toast.error(
        error.response?.data?.error || "An unexpected error occurred."
      );
    }
    throw error;
  }
};

// Creates that carry a clientRef: if a retry loses the race with the original request on the unique
// clientRef index, the server answers 409 but the entry is saved, so count it as saved.
const postWithClientRef = (endpoint, data) =>
  api.post(endpoint, data).catch((err) => {
    if (data.clientRef && isDuplicateClientRefError(err)) {
      return { data: { isDuplicate: true } };
    }
    throw err;
  });

const dashboardService = {
  fetchDashboard: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
    return api.get(`/dashboard?${params.toString()}`).then((res) => res.data);
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

  // What archiving or deleting a card, debt or goal would affect (read, so no handleRequest)
  fetchDeleteImpact: async (accountId) => {
    return api
      .get(`/accounts/${accountId}/delete-impact`)
      .then((res) => res.data);
  },

  // Brings a card or debt to $0 with a payment from Checking, or moves a goal's money back to Checking
  recordFinalPayment: async (accountId) => {
    return handleRequest(
      api.post(`/accounts/${accountId}/final-payment`, {}),
      "Final payment recorded."
    );
  },

  // reason: "written_off" | "closed_by_bank" | "spent"
  adjustBalanceToZero: async (accountId, reason) => {
    return handleRequest(
      api.post(`/accounts/${accountId}/adjust-to-zero`, { reason }),
      "Balance adjusted to $0."
    );
  },

  // options: { mode: "archive" | "delete", series: "end" | "moveToChecking" }. The balance must be $0.
  deleteCreditCard: async (cardId, options = {}) => {
    return handleRequest(
      api.delete(`/credit-cards/${cardId}`, { data: options }),
      options.mode === "delete" ? "Credit card deleted." : "Credit card archived."
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

  deleteDebt: async (debtId, options = {}) => {
    return handleRequest(
      api.delete(`/debts/${debtId}`, { data: options }),
      options.mode === "delete" ? "Debt deleted." : "Debt archived."
    );
  },

  deleteSavingsGoal: async (goalId, options = {}) => {
    return handleRequest(
      api.delete(`/savings-goals/${goalId}`, { data: options }),
      options.mode === "delete" ? "Savings goal deleted." : "Savings goal archived."
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
      : postWithClientRef(endpoint, transaction);
    // The modal explains a timeout itself, so skip the generic toast for it
    return handleRequest(
      request,
      "Transaction saved!",
      true,
      (err) => !isTimeoutError(err)
    );
  },

  addExpense: async (expenseData) => {
    return handleRequest(
      postWithClientRef("/expenses", expenseData),
      null,
      true,
      false // Quick Add shows its own error toast
    );
  },

  addPaycheque: async (paychequeData) => {
    return handleRequest(
      postWithClientRef("/paycheques", paychequeData),
      null,
      true,
      false // Quick Add shows its own error toast
    );
  },

  getFinancialAdvice: async (params = {}) => {
    return handleRequest(
      api.post("/financial-advice", params),
      null,
      false
    );
  },

  categorizeExpense: async (name) => {
    return handleRequest(
      api.post("/categorize-expense", { name }),
      null,
      false
    );
  },

  chatAdvisor: async (message, history = []) => {
    return api.post("/chat-advisor", { message, history }).then((res) => res.data);
  },

  fetchHealth: async () => {
    return api.get("/health").then((res) => res.data);
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
