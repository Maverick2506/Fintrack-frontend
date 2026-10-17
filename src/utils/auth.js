import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
export const IDLE_TIMEOUT_MS = 20 * 60 * 1000; // 20 minutes
const LAST_ACTIVE_KEY = "fintrack_last_active";

export const isLocalHost = () =>
  typeof window !== "undefined" &&
  (window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1");

export const touchLastActive = () => {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
};

const isJwtExpired = (token) => {
  if (!token || token === "dev-local-bypass") return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    if (!payload.exp) return false;
    return payload.exp * 1000 <= Date.now();
  } catch {
    return true;
  }
};

export const login = async (password) => {
  const response = await axios.post(`${API_URL}/auth/login`, { password });
  if (response.data.token) {
    localStorage.setItem("user_token", response.data.token);
    touchLastActive();
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
      touchLastActive();
      return response.data;
    }
  } catch {
    localStorage.setItem("user_token", "dev-local-bypass");
    touchLastActive();
  }
};

export const logout = () => {
  localStorage.removeItem("user_token");
  localStorage.removeItem(LAST_ACTIVE_KEY);
};

export const getToken = () => {
  return localStorage.getItem("user_token");
};

export const isLoggedIn = () => {
  if (isLocalHost()) {
    const params = new URLSearchParams(window.location.search);
    if (params.get("dev") === "1" || params.get("bypass") === "1") {
      localStorage.setItem("user_token", "dev-local-bypass");
      touchLastActive();
      return true;
    }
  }

  const token = localStorage.getItem("user_token");
  if (!token) return false;

  // Check if JWT itself has expired
  if (isJwtExpired(token)) {
    logout();
    return false;
  }

  // Check if the user has been inactive longer than IDLE_TIMEOUT_MS (e.g. tab closed or asleep)
  const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || "0", 10);
  if (lastActive > 0 && Date.now() - lastActive >= IDLE_TIMEOUT_MS) {
    logout();
    return false;
  }

  if (!lastActive) {
    touchLastActive();
  }

  return true;
};
