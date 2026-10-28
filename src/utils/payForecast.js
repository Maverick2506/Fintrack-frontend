import { formatCurrency, formatShortDate } from "./formatUtils.js";

// Variable (hourly) pay on the Safe to Spend card and in the Expected pay sheet.
// The forecast (GET /forecast) says where its income comes from (incomeSource) and which
// paycheque it plans with; the server owns every number, this only words them.

export const NO_INCOME_NOTE = "No income in your forecast — log your paycheques or set Expected pay";

export const PAY_CADENCES = [
  { value: "weekly", label: "Weekly" },
  { value: "bi-weekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Monthly" },
];

const CADENCE_EVERY = { weekly: "every week", "bi-weekly": "every 2 weeks", monthly: "every month" };

const MAX_PLANNING_AMOUNT = 1000000;
const money = (n) => formatCurrency(n, { maximumFractionDigits: 0 });

/**
 * The "Next pay" line under Safe to Spend.
 * @returns {{ kind: "none" } | { kind: "pay", text: string } | null} null while the forecast loads
 */
export const describeNextPay = (forecast) => {
  if (!forecast) return null;
  if (forecast.incomeSource === "none") return { kind: "none" };
  const { planningAmount, typicalAmount, nextPayday } = forecast;
  if (!nextPayday || planningAmount == null) return null;

  const date = formatShortDate(nextPayday);
  const varies = typicalAmount != null && typicalAmount !== planningAmount;
  if (varies) {
    return { kind: "pay", text: `Next pay ~${money(typicalAmount)} (planning with ${money(planningAmount)}) · ${date}` };
  }
  // Recurring pay is a known amount; estimates and Expected pay are approximate
  const approx = forecast.incomeSource === "recurring" ? "" : "~";
  return { kind: "pay", text: `Next pay ${approx}${money(planningAmount)} · ${date}` };
};

/**
 * The no-income note, naming a chosen pay name that's ignored because it isn't regular pay.
 * Same wording as the morning digest.
 */
export const noIncomeNote = (forecast) => {
  const ignored = forecast?.payOverrideIgnored;
  if (!ignored) return NO_INCOME_NOTE;
  return `No income in your forecast — '${ignored.label}' doesn't look like regular pay (${ignored.reason}). Log your paycheques or set Expected pay`;
};

/**
 * "'Amazon Refund' doesn't look like regular pay — using 'Acme Payroll' instead" while the chosen
 * pay name is ignored (it applies again once it forms a series); null otherwise or with no income.
 */
export const describePayOverride = (forecast) => {
  const ignored = forecast?.payOverrideIgnored;
  if (!ignored || forecast.incomeSource === "none") return null;
  const using = forecast.paySeries ? `using '${forecast.paySeries.label}' instead` : "ignored for now";
  return `'${ignored.label}' doesn't look like regular pay — ${using}`;
};

/** A pay name in the "Your pay is" picker: "Acme Payroll · 8 entries · every 2 weeks" */
export const payNameOptionLabel = (name) =>
  `${name.label} · ${name.count} ${name.count === 1 ? "entry" : "entries"} · ${CADENCE_EVERY[name.cadence] || name.cadence}`;

/** "$1,234.50", "1234.5" -> 1234.5; anything else -> null */
export const parsePlanningAmount = (raw) => {
  const cleaned = String(raw ?? "").replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d+)?$|^\.\d+$/.test(cleaned)) return null;
  return Math.round(parseFloat(cleaned) * 100) / 100;
};

const isRealDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
};

/**
 * Checks the Expected pay form. todayStr is Toronto's today (getTorontoTodayStr).
 * @returns {{ ok: boolean, errors: { nextDate?: string, cadence?: string, amount?: string }, payload: object|null }}
 */
export const validateExpectedPay = ({ nextDate, cadence, amountRaw }, todayStr) => {
  const errors = {};
  if (!isRealDate(nextDate)) errors.nextDate = "Pick your next pay date.";
  else if (nextDate < todayStr) errors.nextDate = "Your next pay date can't be in the past.";

  const chosenCadence = cadence || "bi-weekly";
  if (!PAY_CADENCES.some((c) => c.value === chosenCadence)) errors.cadence = "Pick how often you're paid.";

  const amount = parsePlanningAmount(amountRaw);
  if (amount === null) errors.amount = "Enter the paycheque amount to plan with.";
  else if (amount <= 0) errors.amount = "The amount must be more than $0.";
  else if (amount > MAX_PLANNING_AMOUNT) errors.amount = "That amount is too large.";

  const ok = Object.keys(errors).length === 0;
  return { ok, errors, payload: ok ? { nextDate, cadence: chosenCadence, amount } : null };
};
