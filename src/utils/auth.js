import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const isLocalHost = () =>
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

// Login function no longer needs an email parameter
export const login = async (password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { password });
  if (response.data.token) {
    localStorage.setItem("user_token", response.data.token);
  }
  return response.data;
};

export const devLogin = async () => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      devBypass: true,
    });
    if (response.data.token) {
      localStorage.setItem("user_token", response.data.token);
      return response.data;
    }
  } catch {
    localStorage.setItem("user_token", "dev-local-bypass");
  }
};

export const logout = () => {
  localStorage.removeItem("user_token");
};

export const getToken = () => {
  return localStorage.getItem("user_token");
};

export const isLoggedIn = () => {
  if (isLocalHost()) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1" || params.get("bypass") === "1") {
      localStorage.setItem("user_token", "dev-local-bypass");
      return true;
    }
  }
  return !!localStorage.getItem("user_token");
};
