import axios from "axios";
import toast from "react-hot-toast";
import { getToken } from "../utils/auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
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

const handleRequest = async (requestPromise, successMessage) => {
  try {
    const response = await requestPromise;
    if (successMessage) {
      toast.success(successMessage);
    }
    return response.data;
  } catch (error) {
    console.error("API Error:", error);
    toast.error(error.response?.data?.error || "An unexpected error occurred.");
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

  fetchMonthlyExpenses: async (year, month) => {
    const params = new URLSearchParams();
    if (year) params.append("year", year);
    if (month) params.append("month", month);
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
      "Bill deleted successfully."
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

  getFinancialAdvice: async (dashboardData) => {
    return handleRequest(api.post(`/financial-advice`, dashboardData));
  },
};

export default dashboardService;
