import { formatCurrency, formatShortDate } from "./formatUtils.js";
import { getTorontoTodayDate } from "./dateUtils.js";

/**
 * Calculates savings goal pacing, required contribution per month and per paycheque,
 * and current pacing status based on 90-day cleared contributions.
 *
 * @param {object} goal
 * @param {string} [paychequeCadence="bi-weekly"]
 * @param {Date} [today=getTorontoTodayDate()] months are counted from Toronto's day
 * @returns {object}
 */
export function calculatePacing(
  goal,
  paychequeCadence = "bi-weekly",
  today = getTorontoTodayDate()
) {
  if (!goal) return null;

  const current = parseFloat(goal.current_amount ?? goal.initialBalance ?? 0) || 0;
  const target = parseFloat(goal.goal_amount ?? goal.targetAmount ?? 0) || 0;
  const targetDateStr = goal.target_date ?? goal.dueDate;
  const contributedLast90Days = parseFloat(goal.contributedLast90Days || 0) || 0;

  if (target > 0 && current >= target) {
    return {
      status: "REACHED",
      label: "Reached 🎉",
      colorClass: "text-emerald-400",
      badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      requiredPerMonth: 0,
      perPaycheque: 0,
      monthsLeft: 0,
      copy: "Goal reached! 🎉",
    };
  }

  if (!targetDateStr) {
    return {
      status: "NO_TARGET_DATE",
      label: "No target date",
      colorClass: "text-zinc-500",
      badgeClass: "bg-zinc-800 text-zinc-400 border-white/[0.06]",
      requiredPerMonth: 0,
      perPaycheque: 0,
      monthsLeft: null,
      copy: "Add a target date to get a monthly pace",
    };
  }

  const parts = String(targetDateStr).split("T")[0].split("-").map(Number);
  const targetDate = new Date(parts[0], parts[1] - 1, parts[2]);

  const diffMonths =
    (targetDate.getFullYear() - today.getFullYear()) * 12 +
    (targetDate.getMonth() - today.getMonth());
  const monthsLeft = Math.max(1, diffMonths);

  const remaining = Math.max(0, target - current);
  const requiredPerMonth = Math.round((remaining / monthsLeft) * 100) / 100;

  const cadenceMult =
    paychequeCadence === "weekly"
      ? 52 / 12
      : paychequeCadence === "bi-weekly" || paychequeCadence === "biweekly"
      ? 26 / 12
      : 1;
  const perPaycheque = Math.round((requiredPerMonth / cadenceMult) * 100) / 100;

  const recentMonthlyAverage = contributedLast90Days / 3;

  let status = "ON_TRACK";
  let label = "On track";
  let colorClass = "text-emerald-400";
  let badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";

  if (recentMonthlyAverage >= requiredPerMonth) {
    status = "ON_TRACK";
    label = "On track";
    colorClass = "text-emerald-400";
    badgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  } else if (recentMonthlyAverage >= 0.75 * requiredPerMonth) {
    status = "SLIGHTLY_BEHIND";
    label = "Slightly behind";
    colorClass = "text-amber-400";
    badgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
  } else {
    status = "BEHIND";
    label = "Behind";
    colorClass = "text-rose-400";
    badgeClass = "bg-rose-500/10 text-rose-400 border-rose-500/20";
  }

  const dateFormatted = formatShortDate(targetDateStr);
  const copy = `Save ${formatCurrency(requiredPerMonth)}/month (~${formatCurrency(perPaycheque)} per paycheque) to reach ${formatCurrency(target)} by ${dateFormatted}`;

  return {
    status,
    label,
    colorClass,
    badgeClass,
    requiredPerMonth,
    perPaycheque,
    monthsLeft,
    recentMonthlyAverage: Math.round(recentMonthlyAverage * 100) / 100,
    contributedLast90Days,
    copy,
  };
}
