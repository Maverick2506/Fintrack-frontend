import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const getFinancialAdvice = async (dashboardData) => {
  try {
    const response = await axios.post(
      `${API_URL}/financial-advice`,
      dashboardData
    );
    return response.data.advice;
  } catch (error) {
    console.error("Error fetching financial advice:", error);
    throw new Error("Could not retrieve advice at this time.");
  }
};
