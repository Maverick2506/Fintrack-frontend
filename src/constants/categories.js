/**
 * Canonical list of expense categories across FinTrack frontend.
 * Synchronized with fintrack-backend/constants/categories.js.
 */
export const EXPENSE_CATEGORIES = [
  "Essentials",
  "Food & Drink",
  "Shopping",
  "Subscription",
  "Transportation",
  "Entertainment",
  "Debt",
  "Other",
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, "Income"];

/**
 * Round icon for a Ledger row: a lucide icon name (see components/Ledger/CategoryIcon.jsx)
 * and the Tailwind classes that tint the circle. Every EXPENSE_CATEGORIES entry has one;
 * Interest and Adjustment come from the daily interest sweep and Sync with statement; Savings
 * Transfer marks a goal contribution saved as an expense.
 */
export const CATEGORY_STYLES = {
  Essentials: { icon: "House", tint: "bg-sky-500/15 text-sky-300" },
  "Food & Drink": { icon: "Utensils", tint: "bg-amber-500/15 text-amber-300" },
  Shopping: { icon: "ShoppingBag", tint: "bg-pink-500/15 text-pink-300" },
  Subscription: { icon: "CalendarSync", tint: "bg-violet-500/15 text-violet-300" },
  Transportation: { icon: "Car", tint: "bg-cyan-500/15 text-cyan-300" },
  Entertainment: { icon: "Clapperboard", tint: "bg-fuchsia-500/15 text-fuchsia-300" },
  Debt: { icon: "HandCoins", tint: "bg-rose-500/15 text-rose-300" },
  Other: { icon: "Tag", tint: "bg-zinc-500/15 text-zinc-300" },
  Interest: { icon: "Percent", tint: "bg-orange-500/15 text-orange-300" },
  Adjustment: { icon: "SlidersHorizontal", tint: "bg-indigo-500/15 text-indigo-300" },
  "Savings Transfer": { icon: "PiggyBank", tint: "bg-teal-500/15 text-teal-300" },
  Refund: { icon: "Undo2", tint: "bg-emerald-500/15 text-emerald-300" },
};

export const INCOME_STYLE = { icon: "Banknote", tint: "bg-emerald-500/15 text-emerald-300" };
export const TRANSFER_STYLE = { icon: "ArrowLeftRight", tint: "bg-zinc-500/15 text-zinc-300" };
export const DEFAULT_CATEGORY_STYLE = { icon: "CircleDashed", tint: "bg-zinc-500/15 text-zinc-400" };

/** Icon and tint for a Ledger row. Transfers and income go by type; unknown categories get the default. */
export const getCategoryStyle = (category, type) => {
  if (type === "transfer") return TRANSFER_STYLE;
  if (type === "income" || category === "Income") return INCOME_STYLE;
  return (
    (Object.prototype.hasOwnProperty.call(CATEGORY_STYLES, category) && CATEGORY_STYLES[category]) ||
    DEFAULT_CATEGORY_STYLE
  );
};
