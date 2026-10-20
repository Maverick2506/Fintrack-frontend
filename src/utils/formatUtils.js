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
