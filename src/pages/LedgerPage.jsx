import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search,
  Trash2,
  Pencil,
  Plus,
  ReceiptText,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Check,
  Minus,
  X,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import dashboardService from "../services/dashboardService";
import AddTransactionModal from "../components/Modals/AddTransactionModal";
import CompactSummaryBar from "../components/Common/CompactSummaryBar";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import { formatCurrency, formatNumber } from "../utils/formatUtils";
import AccountChip from "../components/Common/AccountChip";
import SwipeableRow from "../components/Ledger/SwipeableRow";
import useMediaQuery from "../hooks/useMediaQuery";
import { getLedgerAccountChip } from "../utils/accountRetire";
import { getTorontoTodayStr } from "../utils/dateUtils";
import { groupLedgerRows, summarizeLedgerGroup } from "../utils/ledgerGroups";

const CATEGORY_COLORS = {
  Income:                "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Essentials:            "bg-zinc-800 text-zinc-300 border-white/[0.08]",
  "Food & Drink":        "bg-amber-500/10 text-amber-300 border-amber-500/20",
  Subscription:          "bg-violet-500/10 text-violet-300 border-violet-500/20",
  Debt:                  "bg-rose-500/10 text-rose-300 border-rose-500/20",
  "Credit Card Payment": "bg-blue-500/10 text-blue-300 border-blue-500/20",
  "Debt Payment":        "bg-blue-500/10 text-blue-300 border-blue-500/20",
  "Savings Transfer":    "bg-teal-500/10 text-teal-300 border-teal-500/20",
  Transport:             "bg-zinc-800 text-zinc-300 border-white/[0.08]",
  Transportation:        "bg-zinc-800 text-zinc-300 border-white/[0.08]",
  Entertainment:         "bg-pink-500/10 text-pink-300 border-pink-500/20",
  Shopping:              "bg-sky-500/10 text-sky-300 border-sky-500/20",
  Health:                "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  Transfer:              "bg-blue-500/10 text-blue-300 border-blue-500/20",
  Interest:              "bg-orange-500/10 text-orange-300 border-orange-500/20",
  Adjustment:            "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  Other:                 "bg-zinc-800/80 text-zinc-400 border-white/[0.06]",
};

const LedgerPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Multi-select state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // Upcoming starts closed; swipe actions show on phones and touch screens
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(null); // { id, action }
  const isTouchList = useMediaQuery("(max-width: 639px), (pointer: coarse)");

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.fetchLedger();
      setRows(data);
      setSelectedIds(new Set());
      setLastClickedIndex(null);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load transaction ledger"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Re-reads the ledger without the loading screen, e.g. after marking a row paid
  const refreshRowsQuietly = useCallback(() => {
    dashboardService
      .fetchLedger()
      .then(setRows)
      .catch((err) => console.error("Failed to refresh ledger:", err));
  }, []);

  const handleMarkPaid = async (row) => {
    setSwipeOpen(null);
    try {
      await dashboardService.markBillAsPaid(
        row.id,
        row.type === "income" ? "Marked as received!" : undefined
      );
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_paid: true } : r)));
      refreshRowsQuietly();
    } catch (err) {
      // handleRequest already showed the error toast
      console.error("Failed to mark transaction as paid:", err);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, [search, typeFilter, categoryFilter, monthFilter]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await dashboardService.deleteBill(deleteTarget.id);
      setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete transaction:", err);
      toast.error(err?.response?.data?.error || "Could not delete the transaction. Please try again.");
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = visibleRows.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    try {
      await dashboardService.bulkDeleteTransactions(ids);
      const idSet = new Set(ids);
      setRows((prev) => prev.filter((r) => !idSet.has(r.id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      setLastClickedIndex(null);
      setIsBulkDeleteModalOpen(false);
    } catch (err) {
      console.error("Failed to bulk delete:", err);
      toast.error(err?.response?.data?.error || "Could not delete the selected transactions. Please try again.");
    }
  };

  const availableCategories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const availableMonths = useMemo(() => {
    const set = new Set(
      rows
        .map((r) => (r.date ? String(r.date).slice(0, 7) : null))
        .filter(Boolean)
    );
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (typeFilter !== "all") data = data.filter((r) => r.type === typeFilter);
    if (categoryFilter !== "all")
      data = data.filter((r) => r.category === categoryFilter);
    if (monthFilter !== "all")
      data = data.filter((r) => String(r.date).startsWith(monthFilter));
    if (search) {
      // Card, debt and goal names count too, since those rows show the account instead of the category
      const q = search.toLowerCase();
      data = data.filter((r) =>
        [r.name, r.category, getLedgerAccountChip(r)?.name].some(
          (text) => text && text.toLowerCase().includes(q)
        )
      );
    }
    return [...data].sort((a, b) => {
      let va = a[sortKey],
        vb = b[sortKey];
      if (sortKey === "date") {
        va = new Date(va);
        vb = new Date(vb);
      }
      if (sortKey === "amount") {
        va = parseFloat(va);
        vb = parseFloat(vb);
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, sortKey, sortDir, typeFilter, categoryFilter, monthFilter]);

  const todayStr = getTorontoTodayStr();
  const groups = useMemo(
    () =>
      groupLedgerRows(filtered, todayStr, {
        dateDir: sortKey === "date" ? sortDir : "desc",
        sortByDate: sortKey === "date",
      }),
    [filtered, todayStr, sortKey, sortDir]
  );

  // Rows on screen, in screen order: select all, Shift ranges and bulk delete only touch these
  const visibleRows = useMemo(
    () =>
      groups.flatMap((g) =>
        g.key === "upcoming" && !isUpcomingOpen ? [] : g.rows
      ),
    [groups, isUpcomingOpen]
  );
  const visibleIndex = useMemo(
    () => new Map(visibleRows.map((r, idx) => [r, idx])),
    [visibleRows]
  );

  const toggleUpcoming = () => {
    if (isUpcomingOpen) {
      // Rows that get hidden drop out of the selection
      const upcomingIds = new Set(
        (groups.find((g) => g.key === "upcoming")?.rows || []).map((r) => r.id)
      );
      setSelectedIds((prev) => new Set([...prev].filter((id) => !upcomingIds.has(id))));
      setLastClickedIndex(null);
    }
    setIsUpcomingOpen((open) => !open);
  };

  const allFilteredSelected =
    visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
  const someFilteredSelected =
    visibleRows.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleRows.forEach((r) => next.add(r.id));
        return next;
      });
    }
  };

  const handleToggleRow = (id, index, shiftKey) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const willSelect = !next.has(id);

      if (shiftKey && lastClickedIndex !== null && lastClickedIndex !== index) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        for (let idx = start; idx <= end; idx++) {
          const rowItem = visibleRows[idx];
          if (rowItem) {
            if (willSelect) next.add(rowItem.id);
            else next.delete(rowItem.id);
          }
        }
      } else {
        if (willSelect) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    setLastClickedIndex(index);
  };

  const totalIncome = filtered
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = filtered
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount, 0);

  const clearedIncome = filtered
    .filter((r) => r.type === "income" && r.is_paid)
    .reduce((s, r) => s + r.amount, 0);
  const pendingIncome = filtered
    .filter((r) => r.type === "income" && !r.is_paid)
    .reduce((s, r) => s + r.amount, 0);

  const clearedExpense = filtered
    .filter((r) => r.type === "expense" && r.is_paid)
    .reduce((s, r) => s + r.amount, 0);
  const pendingExpense = filtered
    .filter((r) => r.type === "expense" && !r.is_paid)
    .reduce((s, r) => s + r.amount, 0);

  const clearedNet = clearedIncome - clearedExpense;

  const SortIcon = ({ k }) => {
    if (sortKey !== k)
      return <ArrowUpDown size={12} className="text-zinc-600 inline ml-1" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-zinc-200 inline ml-1" />
    ) : (
      <ArrowDown size={12} className="text-zinc-200 inline ml-1" />
    );
  };

  const formatRowDate = (date, withYear) => {
    const d = new Date(String(date).slice(0, 10) + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(withYear || String(date).slice(0, 4) !== todayStr.slice(0, 4) ? { year: "numeric" } : {}),
    });
  };

  // Unpaid rows dated today or earlier; rows under Upcoming need no badge
  const getRowStatus = (row) => {
    if (row.is_paid || String(row.date).slice(0, 10) > todayStr) return null;
    return row.type === "income" ? "Not received" : "Unpaid";
  };

  const renderAmount = (row) => (
    <span
      className={
        row.type === "income"
          ? row.is_paid
            ? "text-emerald-400"
            : "text-emerald-400/70"
          : row.type === "transfer"
          ? "text-zinc-400"
          : row.is_paid
          ? "text-zinc-200"
          : "text-zinc-400"
      }
    >
      {row.type === "income" ? "+" : row.type === "transfer" ? "⇄ " : "-"}$
      {formatNumber(row.amount)}
    </span>
  );

  const renderSelectAll = () => (
    <button
      type="button"
      onClick={handleToggleSelectAll}
      disabled={visibleRows.length === 0}
      aria-label="Select all transactions"
      title={allFilteredSelected ? "Deselect all visible" : "Select all visible"}
      className={`w-10 h-10 -ml-3 flex items-center justify-center ${
        visibleRows.length === 0 ? "cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <span
        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
          visibleRows.length === 0
            ? "border-white/10 bg-zinc-900/40 opacity-40"
            : allFilteredSelected || someFilteredSelected
            ? "bg-zinc-100 border-zinc-100 text-zinc-950"
            : "border-white/20 bg-zinc-900/80 hover:border-zinc-400"
        }`}
      >
        {allFilteredSelected && <Check size={11} strokeWidth={3} />}
        {someFilteredSelected && <Minus size={11} strokeWidth={3} />}
      </span>
    </button>
  );

  const renderRowCheckbox = (row, index) => {
    const isSelected = selectedIds.has(row.id);
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleToggleRow(row.id, index, e.shiftKey);
        }}
        aria-label={`Select ${row.name}`}
        className="w-10 h-10 -ml-3 flex items-center justify-center cursor-pointer shrink-0"
      >
        <span
          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
            isSelected
              ? "bg-zinc-100 border-zinc-100 text-zinc-950"
              : "border-white/20 bg-zinc-900/80 hover:border-zinc-400"
          }`}
        >
          {isSelected && <Check size={11} strokeWidth={3} />}
        </span>
      </button>
    );
  };

  const renderGroupHeader = (group) => {
    if (group.key !== "upcoming") {
      return (
        <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
          {group.label}
        </div>
      );
    }
    const { count, moneyIn, moneyOut } = summarizeLedgerGroup(group.rows);
    const Chevron = isUpcomingOpen ? ChevronDown : ChevronRight;
    return (
      <button
        type="button"
        onClick={toggleUpcoming}
        aria-expanded={isUpcomingOpen}
        className="w-full min-h-11 px-4 py-2 flex items-center justify-between gap-3 text-left bg-amber-500/[0.04] hover:bg-amber-500/[0.07] border-b border-white/[0.04] cursor-pointer"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Chevron size={14} className="text-zinc-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
            {group.label}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 tabular-nums">
            {count}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs font-medium tabular-nums whitespace-nowrap">
          {moneyIn > 0 && <span className="text-emerald-400/80">+{formatCurrency(moneyIn)}</span>}
          {moneyOut > 0 && <span className="text-zinc-300">-{formatCurrency(moneyOut)}</span>}
        </span>
      </button>
    );
  };

  // One row of the touch list: checkbox, name, category or account chip, date, amount
  const renderListRow = (row) => {
    const i = visibleIndex.get(row);
    const isSelected = selectedIds.has(row.id);
    const accountChip = getLedgerAccountChip(row);
    const status = getRowStatus(row);
    return (
      <div
        className={`flex items-center gap-1 pl-1 pr-4 py-1.5 min-h-14 ${
          isSelected ? "bg-white/[0.04]" : ""
        }`}
      >
        {renderRowCheckbox(row, i)}
        <div className="flex-1 min-w-0">
          <span
            className={`text-sm font-medium block truncate ${
              row.is_paid ? "text-zinc-200" : "text-zinc-400"
            }`}
            title={row.name}
          >
            {row.name}
          </span>
          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-zinc-500 min-w-0">
            {/* Interest rows (daily sweep or statement sync) get their own chip on phones too */}
            {row.category === "Interest" && (
              <span
                className={`text-[10px] font-medium px-1.5 rounded border whitespace-nowrap shrink-0 ${CATEGORY_COLORS.Interest}`}
              >
                Interest
              </span>
            )}
            {/* Card, debt or goal the row uses; archived ones keep their name */}
            {accountChip ? (
              <AccountChip type={accountChip.type} label={accountChip.label} className="shrink" />
            ) : (
              <span className="text-zinc-400 truncate">{row.category}</span>
            )}
            <span>·</span>
            <span className="tabular-nums shrink-0">{formatRowDate(row.date, false)}</span>
            {status && (
              <>
                <span>·</span>
                <span className="text-amber-400 font-medium shrink-0">{status}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right font-medium text-sm tabular-nums whitespace-nowrap shrink-0 pl-2">
          {renderAmount(row)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading ledger...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-20 text-center">
        <div className="glass-panel p-8 max-w-md mx-auto">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadLedger}
            className="btn-primary justify-center mx-auto cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Activity
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Transaction Ledger
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingTx(null);
            setIsTxModalOpen(true);
          }}
          className="btn-primary w-full sm:w-auto justify-center"
        >
          <Plus size={14} strokeWidth={2} />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* Summary Bar (M3) */}
      <CompactSummaryBar
        items={[
          {
            label: "Total Income",
            shortLabel: "Income",
            value: `+${formatCurrency(clearedIncome)}`,
            colorClass: "text-emerald-400",
            subtitle: `Cleared (${filtered.filter((r) => r.type === "income" && r.is_paid).length} received)`,
            headerBadge: pendingIncome > 0 ? (
              <span className="text-[10px] text-zinc-500 font-medium" title="Unreceived future paycheques">
                +{formatCurrency(pendingIncome)} upcoming
              </span>
            ) : null,
          },
          {
            label: "Total Expenses",
            shortLabel: "Expenses",
            value: `-${formatCurrency(clearedExpense)}`,
            colorClass: "text-rose-400",
            subtitle: `Cleared (${filtered.filter((r) => r.type === "expense" && r.is_paid).length} paid)`,
            headerBadge: pendingExpense > 0 ? (
              <span className="text-[10px] text-zinc-500 font-medium" title="Unpaid upcoming bills">
                {formatCurrency(pendingExpense)} upcoming
              </span>
            ) : null,
          },
          {
            label: "Net Cleared",
            shortLabel: "Net",
            value: formatCurrency(clearedNet),
            colorClass: clearedNet >= 0 ? "text-zinc-100" : "text-rose-400",
            subtitle: (pendingIncome > 0 || pendingExpense > 0)
              ? `Proj: ${formatCurrency(totalIncome - totalExpense)}`
              : "Cleared income minus paid expenses",
            headerBadge: (pendingIncome > 0 || pendingExpense > 0) ? (
              <span className="text-[10px] text-zinc-500 font-medium" title="Projected net if all upcoming items clear">
                Proj: {formatCurrency(totalIncome - totalExpense)}
              </span>
            ) : null,
          },
        ]}
      />

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search description, category or account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/60 text-zinc-100 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-white/[0.07] focus:outline-none focus:border-zinc-500 placeholder-zinc-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-zinc-900/80 text-zinc-300 text-xs font-medium rounded-xl px-3 py-2 border border-white/[0.07] focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="bg-zinc-900/80 text-zinc-300 text-xs font-medium rounded-xl px-3 py-2 border border-white/[0.07] focus:outline-none focus:border-zinc-500"
          >
            <option value="all">All Months</option>
            {availableMonths.map((ym) => {
              const [y, m] = ym.split("-");
              const label = new Date(
                parseInt(y),
                parseInt(m) - 1,
                1
              ).toLocaleDateString("en-US", {
                month: "short",
                year: "numeric",
              });
              return (
                <option key={ym} value={ym}>
                  {label}
                </option>
              );
            })}
          </select>

          <div className="inline-flex p-1 rounded-xl bg-zinc-900/80 border border-white/[0.06]">
            {["all", "income", "expense", "transfer"].map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  typeFilter === t
                    ? "bg-zinc-100 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contextual Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="mb-3 px-4 py-2.5 rounded-xl bg-zinc-900/95 border border-white/[0.1] flex flex-wrap items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-950 text-xs font-semibold tabular-nums">
              {selectedIds.size} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
            >
              <X size={13} />
              <span>Clear selection</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>
                Delete Selected ({selectedIds.size})
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Rows, grouped by date: a swipeable list on phones and touch screens, a table elsewhere */}
      <div className="glass-panel overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-zinc-500 mb-2.5">
                <ReceiptText size={16} />
              </div>
              <p className="text-zinc-300 text-xs font-medium mb-1">
                {rows.length === 0
                  ? "No transactions recorded yet"
                  : "No matching transactions"}
              </p>
              <p className="text-zinc-500 text-[11px] max-w-xs mb-4">
                {rows.length === 0
                  ? "Log your first expense or paycheck to start building your ledger."
                  : "Try adjusting your search query or filters."}
              </p>
              {rows.length === 0 && (
                <button
                  onClick={() => {
                    setEditingTx(null);
                    setIsTxModalOpen(true);
                  }}
                  className="btn-primary"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>Add First Transaction</span>
                </button>
              )}
            </div>
          </div>
        ) : isTouchList ? (
          <div>
            {/* Select all and sort, since the list has no column headers */}
            <div className="flex items-center gap-1 pl-1 pr-2 border-b border-white/[0.06]">
              {renderSelectAll()}
              <span className="text-[11px] text-zinc-500 mr-1">Sort</span>
              {[
                ["date", "Date"],
                ["name", "Name"],
                ["amount", "Amount"],
              ].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => handleSort(k)}
                  className={`h-10 px-2 inline-flex items-center text-[11px] font-medium rounded-lg cursor-pointer ${
                    sortKey === k ? "text-zinc-100" : "text-zinc-500"
                  }`}
                >
                  {label}
                  <SortIcon k={k} />
                </button>
              ))}
            </div>
            {groups.map((group) => {
              const isHidden = group.key === "upcoming" && !isUpcomingOpen;
              return (
                <section key={group.key}>
                  {renderGroupHeader(group)}
                  {!isHidden && (
                    <ul className="divide-y divide-white/[0.04]">
                      {group.rows.map((row) => (
                        <li key={`${row.type}-${row.id}`}>
                          <SwipeableRow
                            openAction={swipeOpen?.id === row.id ? swipeOpen.action : null}
                            onOpenChange={(action) =>
                              setSwipeOpen(action ? { id: row.id, action } : null)
                            }
                            canMarkPaid={!row.is_paid}
                            markPaidLabel={row.type === "income" ? "Received" : "Mark paid"}
                            onMarkPaid={() => handleMarkPaid(row)}
                            onDelete={() => {
                              setSwipeOpen(null);
                              setDeleteTarget(row);
                            }}
                            onTap={() => {
                              setEditingTx(row);
                              setIsTxModalOpen(true);
                            }}
                          >
                            {renderListRow(row)}
                          </SwipeableRow>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                  <th className="w-10 py-3.5 pl-4 pr-1 text-left">
                    {renderSelectAll()}
                  </th>
                  <th
                    className="text-left py-3.5 px-4 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort("name")}
                  >
                    Description <SortIcon k="name" />
                  </th>
                  <th className="text-left py-3.5 px-4 w-28 md:w-36">
                    Category
                  </th>
                  <th
                    className="text-left py-3.5 px-4 w-24 md:w-28 cursor-pointer hover:text-zinc-300 transition-colors"
                    onClick={() => handleSort("date")}
                  >
                    Date <SortIcon k="date" />
                  </th>
                  <th
                    className="w-28 text-right py-3.5 px-4 cursor-pointer hover:text-zinc-300 transition-colors whitespace-nowrap"
                    onClick={() => handleSort("amount")}
                  >
                    Amount <SortIcon k="amount" />
                  </th>
                  <th className="w-20 py-3.5 px-4"></th>
                </tr>
              </thead>
              {groups.map((group) => {
                const isHidden = group.key === "upcoming" && !isUpcomingOpen;
                return (
                  <tbody key={group.key} className="divide-y divide-white/[0.04]">
                    <tr>
                      <td colSpan={6} className="p-0">
                        {renderGroupHeader(group)}
                      </td>
                    </tr>
                    {!isHidden &&
                      group.rows.map((row) => {
                        const i = visibleIndex.get(row);
                        const isSelected = selectedIds.has(row.id);
                        const accountChip = getLedgerAccountChip(row);
                        const status = getRowStatus(row);
                        return (
                          <tr
                            key={`${row.type}-${row.id}`}
                            className={`transition-colors group ${
                              isSelected
                                ? "bg-white/[0.04] hover:bg-white/[0.06]"
                                : "hover:bg-white/[0.02]"
                            }`}
                          >
                            <td
                              className="py-3 pl-4 pr-1 w-10"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleRow(row.id, i, e.shiftKey);
                              }}
                            >
                              {renderRowCheckbox(row, i)}
                            </td>
                            <td className="py-3 px-4 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`text-sm font-medium block truncate ${
                                    row.is_paid ? "text-zinc-200" : "text-zinc-400"
                                  }`}
                                  title={row.name}
                                >
                                  {row.name}
                                </span>
                                {status && (
                                  <span
                                    className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 whitespace-nowrap"
                                    title="Not yet cleared"
                                  >
                                    {status}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 w-28 md:w-36">
                              {/* Card, debt or goal the row uses; archived ones keep their name */}
                              {accountChip ? (
                                <AccountChip type={accountChip.type} label={accountChip.label} />
                              ) : (
                                <span
                                  title={row.category}
                                  className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border whitespace-nowrap block truncate text-center ${
                                    CATEGORY_COLORS[row.category] ||
                                    CATEGORY_COLORS.Other
                                  }`}
                                >
                                  {row.category}
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 w-24 md:w-28 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                              {formatRowDate(row.date, true)}
                            </td>
                            <td className="py-3 px-4 text-right font-medium text-sm tabular-nums whitespace-nowrap w-28">
                              {renderAmount(row)}
                            </td>
                            <td className="py-3 px-4 text-right opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity whitespace-nowrap w-20">
                              <div className="inline-flex items-center gap-0.5">
                                <button
                                  onClick={() => {
                                    setEditingTx(row);
                                    setIsTxModalOpen(true);
                                  }}
                                  title="Edit transaction"
                                  className="btn-ghost-icon"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(row)}
                                  title="Delete transaction"
                                  className="btn-ghost-icon hover:text-rose-400"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                );
              })}
            </table>
          </div>
        )}
        <div className="border-t border-white/[0.05] px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 min-w-0">
            {isTouchList
              ? selectedIds.size > 0
                ? `${selectedIds.size} selected`
                : "Swipe a row for Delete or Mark paid"
              : selectedIds.size > 0
              ? `${selectedIds.size} of ${visibleRows.length} selected (Tip: Hold Shift to select a range)`
              : "Tip: Use checkboxes or Shift+Click to select multiple transactions"}
          </p>
          <p className="text-[11px] text-zinc-500 tabular-nums shrink-0">
            {filtered.length} transactions
          </p>
        </div>
      </div>

      <AddTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        refreshData={loadLedger}
        existingTransaction={editingTx}
        onDelete={(tx) => setDeleteTarget(tx)}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        itemType="transaction"
        itemName={deleteTarget?.name}
      />
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        itemType="selected transactions"
        itemName={`${selectedIds.size} transaction${
          selectedIds.size === 1 ? "" : "s"
        }`}
      />
    </div>
  );
};

export default LedgerPage;
