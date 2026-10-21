/**
 * Formats a numeric value or numeric string as USD/CAD currency with thousands separators
 * and properly placed negative signs (e.g., -$105.21 instead of $-105.21).
 */
export const formatCurrency = (amount, options = {}) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const minimumFractionDigits = Math.min(
    options.minimumFractionDigits ?? 2,
    maximumFractionDigits
  );
  const formatted = absVal.toLocaleString("en-US", {
    ...options,
    minimumFractionDigits,
    maximumFractionDigits,
  });
  return `${isNegative ? "-" : ""}$${formatted}`;
};

/**
 * Formats a numeric value with thousands separators and decimal places (without $).
 */
export const formatNumber = (amount, options = {}) => {
  const num = typeof amount === "number" ? amount : parseFloat(amount) || 0;
  const maximumFractionDigits = options.maximumFractionDigits ?? 2;
  const minimumFractionDigits = Math.min(
    options.minimumFractionDigits ?? 2,
    maximumFractionDigits
  );
  return num.toLocaleString("en-US", {
    ...options,
    minimumFractionDigits,
    maximumFractionDigits,
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

/**
 * Formats an ISO YYYY-MM-DD date string into a friendly "MMM YYYY" string (e.g. "Jan 2030", "Mar 2029").
 */
export const formatMonthYear = (dateStr) => {
  if (!dateStr) return "";
  const parts = String(dateStr).split("T")[0].split("-").map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return dateStr;
  const [y, m, d = 1] = parts;
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
};
