import { useState, useEffect } from "react";
import { formatCurrency, formatMonthYear } from "../utils/formatUtils";
import { simulate } from "../utils/debtMath";
import DebtPayoffPlanner from "../components/Debts/DebtPayoffPlanner";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Landmark,
  CheckCircle2,
  ChevronDown,
  Calculator,
  ChevronRight,
} from "lucide-react";
import AddDebtModal from "../components/Modals/AddDebtModal";
import CompactSummaryBar from "../components/Common/CompactSummaryBar";
import AddDebtPaymentModal from "../components/Modals/AddDebtPaymentModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import EditDebtModal from "../components/Modals/EditDebtModal";
import dashboardService from "../services/dashboardService";

const DebtsPage = () => {
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [modals, setModals] = useState({
    add: false,
    pay: false,
    edit: false,
    delete: false,
  });
  const [activeDebt, setActiveDebt] = useState(null);
  const [showPlannerMobile, setShowPlannerMobile] = useState(false);

  const fetchDebts = async () => {
    setLoading(true);
    try {
      const data = await dashboardService.fetchDebts();
      setDebts(data);
    } catch (error) {
      console.error("Error fetching debts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebts();
  }, []);

  const openModal = (type, debt = null) => {
    setActiveDebt(debt);
    setModals((prev) => ({ ...prev, [type]: true }));
  };

  const closeModal = () => {
    setModals({ add: false, pay: false, edit: false, delete: false });
    setActiveDebt(null);
  };

  const handleDelete = async () => {
    if (!activeDebt) return;
    await dashboardService.deleteDebt(activeDebt.id);
    closeModal();
    fetchDebts();
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading debts...
      </div>
    );
  }

  const activeDebts = debts.filter(
    (d) => (parseFloat(d.total_remaining) || 0) > 0 && d.isActive !== false
  );
  const archivedDebts = debts.filter(
    (d) => (parseFloat(d.total_remaining) || 0) <= 0 || d.isActive === false
  );

  const totalRemaining = activeDebts.reduce(
    (s, d) => s + (parseFloat(d.total_remaining) || 0),
    0
  );
  const totalPrincipal = debts.reduce(
    (s, d) => s + (parseFloat(d.total_amount) || 0),
    0
  );
  const totalPaid = Math.max(0, totalPrincipal - totalRemaining);
  const totalMonthlyCommitment = activeDebts.reduce((s, d) => {
    const p = parseFloat(d.monthly_payment) || 0;
    const freq = d.payment_frequency || "monthly";
    const mult =
      freq === "bi-weekly"
        ? 26 / 12
        : freq === "weekly"
        ? 52 / 12
        : freq === "yearly"
        ? 1 / 12
        : 1;
    return s + p * mult;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="flex justify-between items-center pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Liabilities
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Debt Management
          </h1>
        </div>
        <button onClick={() => openModal("add")} className="btn-primary">
          <Plus size={14} strokeWidth={2} />
          <span>Add Debt</span>
        </button>
      </div>

      {debts.length > 0 && (
        <CompactSummaryBar
          items={[
            {
              label: "Total Remaining Debt",
              shortLabel: "Remaining",
              value: `$${totalRemaining.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
            },
            {
              label: "Total Paid Off",
              shortLabel: "Paid Off",
              value: `$${totalPaid.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              colorClass: "text-emerald-400",
            },
            {
              label: "Monthly Commitment",
              shortLabel: "Monthly",
              value: `$${totalMonthlyCommitment.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              colorClass: "text-rose-400",
            },
          ]}
        />
      )}

      {debts.length === 0 ? (
        <div className="glass-panel p-12 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-400 mb-3">
            <Landmark size={18} />
          </div>
          <p className="text-zinc-300 text-sm font-medium mb-1">
            No active debts recorded
          </p>
          <p className="text-zinc-500 text-xs max-w-xs mb-5">
            Track loans, balances, and automated payoff schedules in one place.
          </p>
          <button onClick={() => openModal("add")} className="btn-primary">
            <Plus size={14} strokeWidth={2} />
            <span>Add First Debt</span>
          </button>
        </div>
      ) : (
        <>
          {activeDebts.length === 0 && archivedDebts.length > 0 ? (
            <div className="glass-panel p-8 text-center flex flex-col items-center mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="text-base font-semibold text-zinc-100 mb-1">
                You are debt free! 🎉
              </h3>
              <p className="text-zinc-400 text-xs max-w-sm mb-4">
                All of your recorded debts have been completely paid off. Fantastic job!
              </p>
              <button
                onClick={() => openModal("add")}
                className="btn-secondary !text-xs"
              >
                <Plus size={13} />
                <span>Add New Debt</span>
              </button>
            </div>
          ) : (
            <>
{/* Active Debts Grid (rendered first per M7) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {activeDebts.map((debt) => {
                  const progress =
                    parseFloat(debt.total_amount) > 0
                      ? ((parseFloat(debt.total_amount) -
                          parseFloat(debt.total_remaining)) /
                          parseFloat(debt.total_amount)) *
                        100
                      : 0;
                  const paidAmount =
                    parseFloat(debt.total_amount) - parseFloat(debt.total_remaining);

                  const freq = debt.payment_frequency || "monthly";
                  const hasApr =
                    debt.interest_rate !== null &&
                    debt.interest_rate !== undefined &&
                    debt.interest_rate !== "" &&
                    parseFloat(debt.interest_rate) > 0;

                  const singleSim = simulate([debt], 0);
                  const debtDetail = singleSim.perDebt[0];
                  const isInsolvent = debtDetail && !debtDetail.isSolvent;
                  const payoffMonths = debtDetail?.payoffMonth;

                  return (
                    <div
                      key={debt.id}
                      className="glass-panel p-5 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h2 className="text-base font-semibold text-zinc-100">
                              {debt.name}
                            </h2>
                            {debt.auto_pay && (
                              <span className="inline-flex items-center gap-1 text-[11px] bg-white/[0.06] text-zinc-300 border border-white/[0.08] px-2 py-0.5 rounded-full mt-1">
                                <RefreshCw size={10} />
                                <span>Auto-Pay</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openModal("edit", debt)}
                              title="Edit debt"
                              className="btn-ghost-icon"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => openModal("delete", debt)}
                              title="Delete debt"
                              className="btn-ghost-icon hover:text-rose-400"
                            >
                              <Trash2 size={14} />
                            </button>
                            <button
                              onClick={() => openModal("pay", debt)}
                              className="btn-secondary ml-1"
                            >
                              Pay
                            </button>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-xs text-zinc-500 mb-0.5">Remaining</p>
                          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
                            {formatCurrency(debt.total_remaining)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs text-zinc-500 mb-1.5 tabular-nums">
                          <span>{formatCurrency(paidAmount)} paid</span>
                          <span>{progress.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-rose-400 h-1.5 rounded-full transition-all duration-500"
                            style={{
                              width:
                                progress > 0
                                  ? `max(${progress.toFixed(1)}%, 4px)`
                                  : "0%",
                            }}
                          />
                        </div>

                        {isInsolvent ? (
                          <p className="text-[11px] text-rose-400 font-medium mt-2.5 text-right tabular-nums">
                            This payment never pays off the debt (${debtDetail?.solvencyInterest}/mo interest)
                          </p>
                        ) : !hasApr ? (
                          <div className="mt-2.5 flex items-center justify-between text-[11px]">
                            <button
                              type="button"
                              onClick={() => openModal("edit", debt)}
                              className="text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil size={10} />
                              <span>Add interest rate for accurate estimate</span>
                            </button>
                            {payoffMonths && (
                              <span className="text-zinc-500 tabular-nums">
                                ~{payoffMonths} mos (0% APR)
                              </span>
                            )}
                          </div>
                        ) : payoffMonths ? (
                          <p className="text-[11px] text-zinc-400 mt-2.5 text-right tabular-nums">
                            Est. payoff in ~{payoffMonths}{" "}
                            {payoffMonths === 1 ? "month" : "months"}
                            {debtDetail?.payoffDate && (
                              <span> ({formatMonthYear(debtDetail.payoffDate)})</span>
                            )}
                            {debtDetail?.totalInterest > 0 && (
                              <span className="text-zinc-500">
                                {" "}· {formatCurrency(debtDetail.totalInterest)} interest
                              </span>
                            )}
                            {freq !== "monthly" && (
                              <span className="text-zinc-600"> ({freq})</span>
                            )}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Collapsible Payoff Planner on Mobile (M7) */}
              {activeDebts.length > 0 && (
                <div className="mt-8 mb-8">
                  <button
                    type="button"
                    onClick={() => setShowPlannerMobile(!showPlannerMobile)}
                    className="md:hidden w-full glass-panel p-4 flex items-center justify-between text-left mb-3 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Calculator size={15} />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-zinc-100 uppercase tracking-wider block">
                          Payoff Planner
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          Simulate extra payments & payoff strategies
                        </span>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                      {showPlannerMobile ? "Collapse ▴" : "Open ▸"}
                    </span>
                  </button>
                  <div className={showPlannerMobile ? "block" : "hidden md:block"}>
                    <DebtPayoffPlanner
                      debts={activeDebts}
                      onEditDebt={(debt) => openModal("edit", debt)}
                    />
                  </div>
                </div>
              )}
            </>
          )}

          {/* --- Paid Off & Archived Section --- */}
          {archivedDebts.length > 0 && (
            <div className="mt-8 border-t border-white/[0.06] pt-6">
              <button
                type="button"
                onClick={() => setShowArchived((prev) => !prev)}
                className="flex items-center justify-between w-full p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] border border-white/[0.05] transition-colors text-left"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-sm font-medium text-zinc-300">
                    Paid Off & Archived
                  </span>
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                    {archivedDebts.length}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <span>{showArchived ? "Hide" : "Show"}</span>
                  {showArchived ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </div>
              </button>

              {showArchived && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
                  {archivedDebts.map((debt) => {
                    const totalAmount = parseFloat(debt.total_amount) || 0;

                    return (
                      <div
                        key={debt.id}
                        className="glass-panel p-5 flex flex-col justify-between opacity-85 hover:opacity-100 transition-opacity border-emerald-500/15"
                      >
                        <div>
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h2 className="text-base font-semibold text-zinc-200">
                                {debt.name}
                              </h2>
                              <span className="inline-flex items-center gap-1 text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full mt-1 font-medium">
                                ✓ Paid in Full
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openModal("edit", debt)}
                                title="Edit debt"
                                className="btn-ghost-icon"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => openModal("delete", debt)}
                                title="Delete debt"
                                className="btn-ghost-icon hover:text-rose-400"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="mb-4">
                            <p className="text-xs text-zinc-500 mb-0.5">
                              Remaining Balance
                            </p>
                            <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
                              $0.00
                            </p>
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-zinc-500 mb-1.5 tabular-nums">
                            <span>{formatCurrency(totalAmount)} total paid</span>
                            <span className="text-emerald-400 font-medium">
                              100%
                            </span>
                          </div>
                          <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-400 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: "100%" }}
                            />
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-2.5 text-right tabular-nums">
                            Debt cleared 🎉
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}

      <AddDebtPaymentModal
        isOpen={modals.pay}
        onClose={closeModal}
        refreshData={fetchDebts}
        debtId={activeDebt?.id}
        debt={activeDebt}
      />
      <AddDebtModal
        isOpen={modals.add}
        onClose={closeModal}
        refreshData={fetchDebts}
      />
      <EditDebtModal
        isOpen={modals.edit}
        onClose={closeModal}
        refreshData={fetchDebts}
        debt={activeDebt}
      />
      <ConfirmDeleteModal
        isOpen={modals.delete}
        onClose={closeModal}
        onConfirm={handleDelete}
        itemType="debt"
        itemName={activeDebt?.name}
      />
    </div>
  );
};

export default DebtsPage;
