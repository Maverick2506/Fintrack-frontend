/**
 * Upcoming Bills rows for debts paid by hand. The backend projects the next payment of each
 * manual debt (GET /dashboard upcomingDebtPayments, the same schedule the forecast counts).
 */

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * One row per manual debt payment, overdue when its due date is before Toronto's today.
 * debts (the Dashboard's debtSummary) supplies the debt the Pay dialog needs.
 */
export const debtPaymentRows = (payments, debts, todayStr) =>
  (payments || []).map((p) => ({
    key: `debt-payment:${p.debtId}`,
    debtId: p.debtId,
    title: p.title || `${p.name} payment`,
    date: p.date,
    dueDate: p.dueDate,
    amount: Number(p.amount) || 0,
    overdue: Boolean(p.dueDate && todayStr && p.dueDate < todayStr),
    minimumPayment: Number(p.minimumPayment) || 0,
    balance: Number(p.balance) || 0,
    debt: (debts || []).find((d) => d.id === p.debtId) || null,
  }));

/** Amount the Pay dialog opens with: the minimum payment, never more than what's owed. */
export const debtPayPrefill = (row) => {
  const owed = Number(row?.debt?.initialBalance ?? row?.balance) || 0;
  const min = Number(row?.debt?.minimumPayment ?? row?.minimumPayment) || 0;
  const amount = owed > 0 ? Math.min(min, owed) : min;
  return amount > 0 ? round2(amount).toFixed(2) : "";
};

/**
 * Bills and debt payments in one list by date. Overdue debt payments (dated today) come first
 * on their day.
 */
export const mergeUpcoming = (bills, debtRows) => {
  const items = [
    ...(bills || []).map((bill) => ({ kind: "bill", date: bill.date || bill.due_date || "", bill })),
    ...(debtRows || []).map((row) => ({ kind: "debt", date: row.date || "", row })),
  ];
  const rank = (it) => (it.kind === "debt" && it.row.overdue ? 0 : 1);
  return items
    .map((it, i) => ({ it, i }))
    .sort((a, b) => (a.it.date < b.it.date ? -1 : a.it.date > b.it.date ? 1 : rank(a.it) - rank(b.it) || a.i - b.i))
    .map(({ it }) => it);
};
