import axios from "axios";

const API_BASE = "http://localhost:8000/api";

export const fetchDashboard = () => axios.get(`${API_BASE}/dashboard`);
export const addExpense = (payload) =>
  axios.post(`${API_BASE}/expenses`, payload);
export const addIncome = (payload) =>
  axios.post(`${API_BASE}/paycheques`, payload);
