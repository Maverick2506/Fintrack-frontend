import { useState, useEffect, useCallback } from "react";
import {
  Repeat,
  TrendingUp,
  CreditCard,
  Building,
  Calendar,
  Pencil,
  Ban,
  Plus,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import { formatCurrency } from "../utils/formatUtils";
import { getTorontoTodayStr } from "../utils/dateUtils";
import AddTransactionModal from "../components/Modals/AddTransactionModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import CompactSummaryBar from "../components/Common/CompactSummaryBar";

const CADENCE_LABELS = {
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

const CADENCE_BADGES = {
  weekly: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  "bi-weekly": "bg-sky-500/10 text-sky-300 border-sky-500/20",
  monthly: "bg-violet-500/10 text-violet-300 border-violet-500/20",
  yearly: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
};

const SubscriptionsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);

  const loadSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await dashboardService.fetchSubscriptions();
      setData(res);
    } catch (err) {
      console.error("Failed to fetch subscriptions:", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Could not load subscriptions."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  const handleEditNextCharge = async (sub) => {
    // Attempt to load full transaction details from ledger or create an edit payload
    try {
      const ledger = await dashboardService.fetchLedger();
      const match = ledger.find((t) => t.id === sub.nextTransactionId);
      if (match) {
        setEditingTx(match);
      } else {
        setEditingTx({
          id: sub.nextTransactionId,
          type: "expense",
          name: sub.name,
          amount: sub.latestAmount,
          category: sub.category,
          date: sub.nextDate || getTorontoTodayStr(),
          recurrence: sub.cadence,
          isTaxExclusive: sub.isTaxExclusive,
          taxRate: sub.taxRate,
          baseAmount: sub.baseAmount,
          is_paid: false,
        });
      }
      setIsTxModalOpen(true);
    } catch {
      setEditingTx({
        id: sub.nextTransactionId,
        type: "expense",
        name: sub.name,
        amount: sub.latestAmount,
        category: sub.category,
        date: sub.nextDate || getTorontoTodayStr(),
        recurrence: sub.cadence,
        isTaxExclusive: sub.isTaxExclusive,
        taxRate: sub.taxRate,
        baseAmount: sub.baseAmount,
        is_paid: false,
      });
      setIsTxModalOpen(true);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    try {
      await dashboardService.cancelSubscription(
        cancelTarget.recurringGroupId || cancelTarget.id || cancelTarget.latestTransactionId
      );
      setCancelTarget(null);
      await loadSubscriptions();
    } catch (err) {
      console.error("Failed to cancel subscription:", err);
    }
  };

  const subscriptions = data?.subscriptions || [];
  const totalMonthly = data?.totalMonthly || 0;
  const totalAnnual = data?.totalAnnual || 0;
  const count = data?.count || 0;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Recurring Expenses
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Subscriptions
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Cadence-normalized costs and automated price-change detection across recurring services.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingTx(null);
            setIsTxModalOpen(true);
          }}
          className="btn-primary self-start sm:self-auto"
        >
          <Plus size={14} strokeWidth={2} />
          <span>Add Recurring Expense</span>
        </button>
      </div>

      {/* Summary KPI Panel (M3) */}
      <CompactSummaryBar
        items={[
          {
            label: "Normalized Monthly Spend",
            shortLabel: "Monthly",
            value: formatCurrency(totalMonthly),
            unit: "/mo",
            subtitle: "All cadences normalized to monthly equivalent",
          },
          {
            label: "Projected Annual Cost",
            shortLabel: "Annual",
            value: formatCurrency(totalAnnual),
            unit: "/yr",
            subtitle: "Expected 12-month recurring commitment",
          },
          {
            label: "Active Subscriptions",
            shortLabel: "Active",
            value: count,
            colorClass: "text-emerald-400",
            subtitle: "Tracking recurring expenses with active schedules",
          },
        ]}
      />

      {/* Main Table / List */}
      {loading ? (
        <div className="text-center text-zinc-500 text-sm p-12">
          Loading subscriptions...
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center text-rose-400 text-sm">
          {error}
        </div>
      ) : subscriptions.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-3">
            <Repeat size={18} />
          </div>
          <p className="text-zinc-300 text-sm font-medium mb-1">
            No active subscriptions found
          </p>
          <p className="text-zinc-500 text-xs max-w-sm mb-5">
            Add recurring bills, streaming services, or software subscriptions with weekly, bi-weekly, monthly, or yearly recurrence.
          </p>
          <button
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            className="btn-primary"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Subscription</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List (< md screens - M1) */}
          <div className="md:hidden space-y-3">
            {subscriptions.map((sub) => {
              const badgeClass =
                CADENCE_BADGES[sub.cadence] ||
                "bg-zinc-800 text-zinc-300 border-white/[0.08]";
              const hasPriceChange = Boolean(sub.priceChange);
              const isHike =
                hasPriceChange && sub.priceChange.difference > 0;

              return (
                <div key={sub.id} className="glass-panel p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-zinc-100 text-sm truncate">
                          {sub.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass} shrink-0`}
                        >
                          {CADENCE_LABELS[sub.cadence] || sub.cadence}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-zinc-400 truncate">
                        <span>{sub.category}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-zinc-400 truncate">
                          {sub.isCreditCard ? (
                            <CreditCard size={11} className="shrink-0" />
                          ) : (
                            <Building size={11} className="shrink-0" />
                          )}
                          <span className="truncate">{sub.payingAccount}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-zinc-100 text-sm tabular-nums">
                        {formatCurrency(sub.monthlyCost)}
                        <span className="text-zinc-500 font-normal text-xs">/mo</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 tabular-nums mt-0.5">
                        {formatCurrency(sub.latestAmount)}
                        {sub.isTaxExclusive ? " + tax" : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar size={12} className="text-zinc-500 shrink-0" />
                      <span>{sub.nextDate ? `next ${sub.nextDate}` : "None scheduled"}</span>
                    </div>
                    {hasPriceChange && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                          isHike
                            ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                        }`}
                      >
                        <TrendingUp
                          size={11}
                          className={
                            isHike
                              ? "rotate-0 text-amber-300"
                              : "rotate-180 text-emerald-400"
                          }
                        />
                        <span>
                          {formatCurrency(sub.priceChange.from)} → {formatCurrency(sub.priceChange.to)} (
                          {sub.priceChange.percent > 0 ? "+" : ""}
                          {sub.priceChange.percent}%)
                        </span>
                      </span>
                    )}
                  </div>

                  {/* Actions - min-h-[40px] tap targets for mobile */}
                  <div className="flex items-center gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => handleEditNextCharge(sub)}
                      className="flex-1 min-h-[40px] px-3 rounded-lg bg-zinc-900 border border-white/10 text-xs font-medium text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Pencil size={13} className="text-zinc-400" />
                      <span>Edit next charge</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCancelTarget(sub)}
                      className="min-h-[40px] px-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      title="Cancel subscription"
                    >
                      <Ban size={13} />
                      <span>Cancel</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table (>= md screens) */}
          <div className="hidden md:block glass-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/[0.06] text-zinc-500 font-medium bg-zinc-950/40">
                  <th className="py-3 px-4">Service</th>
                  <th className="py-3 px-4">Cadence</th>
                  <th className="py-3 px-4 text-right">Latest Charge</th>
                  <th className="py-3 px-4 text-right">Monthly / Annual</th>
                  <th className="py-3 px-4">Next Charge</th>
                  <th className="py-3 px-4">Price History</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {subscriptions.map((sub) => {
                  const badgeClass =
                    CADENCE_BADGES[sub.cadence] ||
                    "bg-zinc-800 text-zinc-300 border-white/[0.08]";
                  const hasPriceChange = Boolean(sub.priceChange);
                  const isHike =
                    hasPriceChange && sub.priceChange.difference > 0;

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* Service name & paying account */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-zinc-100 text-sm">
                          {sub.name}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                          <span className="truncate max-w-[120px]">
                            {sub.category}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-zinc-400">
                            {sub.isCreditCard ? (
                              <CreditCard size={11} className="shrink-0" />
                            ) : (
                              <Building size={11} className="shrink-0" />
                            )}
                            <span className="truncate max-w-[130px]">
                              {sub.payingAccount}
                            </span>
                          </span>
                        </div>
                      </td>

                      {/* Cadence badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badgeClass}`}
                        >
                          {CADENCE_LABELS[sub.cadence] || sub.cadence}
                        </span>
                      </td>

                      {/* Latest charge */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <span className="font-semibold text-zinc-100 text-sm">
                          {formatCurrency(sub.latestAmount)}
                        </span>
                        {sub.isTaxExclusive && (
                          <div className="text-[10px] text-zinc-500">
                            + tax
                          </div>
                        )}
                      </td>

                      {/* Normalized costs */}
                      <td className="py-3 px-4 text-right tabular-nums">
                        <div className="font-semibold text-zinc-200">
                          {formatCurrency(sub.monthlyCost)}
                          <span className="text-zinc-500 font-normal text-[11px]">
                            /mo
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {formatCurrency(sub.annualCost)}/yr
                        </div>
                      </td>

                      {/* Next charge */}
                      <td className="py-3 px-4">
                        {sub.nextDate ? (
                          <div className="flex items-center gap-1.5 text-zinc-300 font-medium">
                            <Calendar size={12} className="text-zinc-500 shrink-0" />
                            <span>{sub.nextDate}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 italic text-[11px]">
                            None scheduled
                          </span>
                        )}
                        {sub.lastPaidDate && (
                          <div className="text-[10px] text-zinc-500 mt-0.5">
                            Last paid: {sub.lastPaidDate}
                          </div>
                        )}
                      </td>

                      {/* Price History / Alert */}
                      <td className="py-3 px-4">
                        {hasPriceChange ? (
                          <div
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              isHike
                                ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                            }`}
                            title={`Price changed on ${sub.priceChange.date}`}
                          >
                            <TrendingUp
                              size={11}
                              className={
                                isHike
                                  ? "rotate-0 text-amber-300"
                                  : "rotate-180 text-emerald-400"
                              }
                            />
                            <span>
                              {formatCurrency(sub.priceChange.from)} →{" "}
                              {formatCurrency(sub.priceChange.to)} (
                              {sub.priceChange.percent > 0 ? "+" : ""}
                              {sub.priceChange.percent}%)
                            </span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-[11px]">
                            Stable
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEditNextCharge(sub)}
                            className="btn-ghost-icon text-zinc-400 hover:text-zinc-100"
                            title="Edit next charge"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setCancelTarget(sub)}
                            className="btn-ghost-icon text-zinc-500 hover:text-rose-400"
                            title="Cancel subscription (stops future recurring occurrences)"
                          >
                            <Ban size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      <AddTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        refreshData={loadSubscriptions}
        existingTransaction={editingTx}
      />

      {/* Cancel Subscription Confirmation Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleConfirmCancel}
        itemType="subscription"
        itemName={cancelTarget?.name}
        title={cancelTarget ? `Cancel ${cancelTarget.name}?` : "Cancel subscription?"}
        description={
          cancelTarget?.unpaidUpcomingCount > 0
            ? `This stops future recurring occurrences and removes ${cancelTarget.unpaidUpcomingCount} upcoming unpaid charge${cancelTarget.unpaidUpcomingCount > 1 ? "s" : ""} (${formatCurrency(cancelTarget.unpaidUpcomingTotal)}).`
            : "This stops future recurring occurrences."
        }
        confirmLabel="Cancel Subscription"
        cancelLabel="Keep"
      />
    </div>
  );
};

export default SubscriptionsPage;
