/**
 * The Widgets page: KWGT formulas that read FinTrack's widget feed (GET /export/widget.json).
 * KWGT downloads a URL once and shares it between formulas, so every formula uses the same URL.
 */

// KWGT's web-get: $wg("<url>", json, ".safe_to_spend")$
export const kwgtFormula = (url, field) => `$wg("${String(url || "").replace(/"/g, "%22")}", json, ".${field}")$`;

// One formula per line of the suggested widget. bar: the field is 0-100 for a Progress item.
export const WIDGET_FORMULAS = [
  { field: "safe_to_spend", label: "Safe to Spend", example: "$412" },
  { field: "safe_until", label: "Safe until (next payday)", example: "Nov 6" },
  { field: "status", label: "Status", example: "On track, Low or No income" },
  { field: "bill1_title", label: "Next bill", example: "Rent" },
  { field: "bill1_date", label: "Next bill date", example: "Nov 1" },
  { field: "bill1_amount", label: "Next bill amount", example: "$1,500" },
  { field: "bill1_flag", label: "Next bill flag", example: "overdue, today or empty" },
  { field: "month_spent", label: "Spent this month", example: "$950" },
  { field: "month_budget", label: "Monthly budget", example: "$1,000" },
  { field: "month_pct", label: "Budget used (bar)", example: "95", bar: true },
  { field: "top_category", label: "Top category", example: "Food & Drink" },
  { field: "card1_name", label: "Card 1 name", example: "TD Visa" },
  { field: "card1_balance", label: "Card 1 balance", example: "$1,235" },
  { field: "card1_pct", label: "Card 1 used (bar)", example: "25", bar: true },
  { field: "card1_due", label: "Card 1 due", example: "Nov 10" },
  { field: "goal1_name", label: "Goal 1 name", example: "Trip" },
  { field: "goal1_pct", label: "Goal 1 saved (bar)", example: "25", bar: true },
  { field: "as_of", label: "Updated at", example: "Oct 28, 9:14 am" },
];

// Bills, cards and goals go up to 3: bill2_title, card3_balance, goal2_pct...
export const SLOT_NOTE = "Change the 1 to 2 or 3 for the next bill, card or goal (bill2_title, card3_balance, goal2_pct).";

// The feed allows 30 downloads an hour, and KWGT shares one download between formulas
export const SUGGESTED_REFRESH_MINUTES = 30;
