/**
 * Categories of a payment toward a card or debt. The backend saves a payment made with "Debt" as
 * "Debt Payment" (to a debt) or "Credit Card Payment" (to a card); the form treats all three as the
 * Debt choice with its pay-down target picker.
 */
export const PAYDOWN_CATEGORIES = ["Debt", "Debt Payment", "Credit Card Payment"];

/** Shows the pay-down target picker and sends the picked card or debt */
export const isPaydownCategory = (category) => PAYDOWN_CATEGORIES.includes(category);

/** The Debt chip (a purchase in Debt, or a payment to a debt): Pay Full and no payment-method picker */
export const isDebtCategory = (category) => category === "Debt" || category === "Debt Payment";
