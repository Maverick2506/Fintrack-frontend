import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

// Login function no longer needs an email parameter
export const login = async (password) => {
  const response = await axios.post(`${API_URL}/api/auth/login`, { password });
  if (response.data.token) {
    localStorage.setItem("user_token", response.data.token);
  }
  return response.data;
};

export const logout = () => {
  localStorage.removeItem("user_token");
};

export const getToken = () => {
  return localStorage.getItem("user_token");
};

export const isLoggedIn = () => {
  return !!localStorage.getItem("user_token");
};
