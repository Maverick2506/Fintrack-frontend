/**
 * Formats a numeric value or numeric string as USD/CAD currency with thousands separators
 * and properly placed negative signs (e.g., -$105.21 instead of $-105.21).
 */
export const formatCurrency = (amount, options = {}) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
  return `${isNegative ? "-" : ""}$${formatted}`;
};

/**
 * Formats a numeric value with thousands separators and 2 decimal places (without $).
 */
export const formatNumber = (amount, options = {}) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options,
  });
};

/**
 * Formats an ISO YYYY-MM-DD date string into a friendly "MMM D" string (e.g. "Oct 22", "Nov 1").
 */
export const formatShortDate = (dateStr) => {
  if (!dateStr) return "";
  const parts = String(dateStr).split("T")[0].split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return dateStr;
  const [y, m, d] = parts;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};
