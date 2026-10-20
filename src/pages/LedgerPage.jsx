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
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import AddTransactionModal from "../components/Modals/AddTransactionModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";

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
  Other:                 "bg-zinc-800/80 text-zinc-400 border-white/[0.06]",
};

const LedgerPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const loadLedger = useCallback(async () => {
    setLoading(true);
    try {
      const data = await dashboardService.fetchLedger();
      setRows(data);
      setSelectedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    await dashboardService.deleteBill(deleteTarget.id);
    setRows((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
    setDeleteTarget(null);
  };

  const handleConfirmBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await dashboardService.bulkDeleteTransactions(ids);
    const idSet = new Set(ids);
    setRows((prev) => prev.filter((r) => !idSet.has(r.id)));
    setSelectedIds(new Set());
    setIsBulkDeleteModalOpen(false);
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
    if (search)
      data = data.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.category &&
            r.category.toLowerCase().includes(search.toLowerCase()))
      );
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

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected =
    filtered.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;

  const handleToggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.delete(r.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filtered.forEach((r) => next.add(r.id));
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
          const rowItem = filtered[idx];
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

  const SortIcon = ({ k }) => {
    if (sortKey !== k)
      return <ArrowUpDown size={12} className="text-zinc-600 inline ml-1" />;
    return sortDir === "asc" ? (
      <ArrowUp size={12} className="text-zinc-200 inline ml-1" />
    ) : (
      <ArrowDown size={12} className="text-zinc-200 inline ml-1" />
    );
  };

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading ledger...
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

      {/* Summary bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-panel p-5">
          <p className="text-xs font-medium text-zinc-500 mb-1">Total Income</p>
          <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
            +$
            {totalIncome.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs font-medium text-zinc-500 mb-1">
            Total Expenses
          </p>
          <p className="text-2xl font-semibold text-rose-400 tabular-nums">
            -$
            {totalExpense.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
        <div className="glass-panel p-5">
          <p className="text-xs font-medium text-zinc-500 mb-1">Net Balance</p>
          <p
            className={`text-2xl font-semibold tabular-nums ${
              totalIncome - totalExpense >= 0
                ? "text-zinc-100"
                : "text-rose-400"
            }`}
          >
            $
            {(totalIncome - totalExpense).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            type="text"
            placeholder="Search description or category..."
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

      {/* Table */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                <th className="w-10 py-3.5 pl-4 pr-1 text-left">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    disabled={filtered.length === 0}
                    aria-label="Select all transactions"
                    title={
                      allFilteredSelected
                        ? "Deselect all visible"
                        : "Select all visible"
                    }
                    className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                      filtered.length === 0
                        ? "border-white/10 bg-zinc-900/40 opacity-40 cursor-not-allowed"
                        : allFilteredSelected || someFilteredSelected
                        ? "bg-zinc-100 border-zinc-100 text-zinc-950 cursor-pointer"
                        : "border-white/20 bg-zinc-900/80 hover:border-zinc-400 cursor-pointer"
                    }`}
                  >
                    {allFilteredSelected && <Check size={11} strokeWidth={3} />}
                    {someFilteredSelected && <Minus size={11} strokeWidth={3} />}
                  </button>
                </th>
                <th
                  className="text-left py-3.5 px-3 sm:px-4 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("name")}
                >
                  Description <SortIcon k="name" />
                </th>
                <th className="hidden sm:table-cell text-left py-3.5 px-4">
                  Category
                </th>
                <th
                  className="hidden sm:table-cell text-left py-3.5 px-4 cursor-pointer hover:text-zinc-300 transition-colors"
                  onClick={() => handleSort("date")}
                >
                  Date <SortIcon k="date" />
                </th>
                <th
                  className="text-right py-3.5 px-3 sm:px-4 cursor-pointer hover:text-zinc-300 transition-colors whitespace-nowrap"
                  onClick={() => handleSort("amount")}
                >
                  Amount <SortIcon k="amount" />
                </th>
                <th className="w-16 sm:w-20 py-3.5 pr-3 sm:px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-4 text-center">
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
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => {
                  const isSelected = selectedIds.has(row.id);
                  const formattedDate = new Date(
                    row.date + "T12:00:00"
                  ).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  });
                  return (
                    <tr
                      key={`${row.type}-${row.id}-${i}`}
                      className={`transition-colors group ${
                        isSelected
                          ? "bg-white/[0.04] hover:bg-white/[0.06]"
                          : "hover:bg-white/[0.02]"
                      }`}
                    >
                      <td className="py-3 pl-4 pr-1">
                        <button
                          type="button"
                          onClick={(e) =>
                            handleToggleRow(row.id, i, e.shiftKey)
                          }
                          aria-label={`Select ${row.name}`}
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-zinc-100 border-zinc-100 text-zinc-950"
                              : "border-white/20 bg-zinc-900/80 hover:border-zinc-400"
                          }`}
                        >
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </button>
                      </td>
                      <td className="py-3 px-3 sm:px-4">
                        <span className="text-zinc-200 font-medium text-sm block">
                          {row.name}
                        </span>
                        {/* Mobile inline Category + Date subtitle */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 sm:hidden">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                              CATEGORY_COLORS[row.category] ||
                              CATEGORY_COLORS.Other
                            }`}
                          >
                            {row.category}
                          </span>
                          <span className="text-[11px] text-zinc-500 tabular-nums">
                            · {formattedDate}
                          </span>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-4">
                        <span
                          className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border whitespace-nowrap ${
                            CATEGORY_COLORS[row.category] ||
                            CATEGORY_COLORS.Other
                          }`}
                        >
                          {row.category}
                        </span>
                      </td>
                      <td className="hidden sm:table-cell py-3 px-4 text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                        {formattedDate}
                      </td>
                      <td className="py-3 px-3 sm:px-4 text-right font-medium text-sm tabular-nums whitespace-nowrap">
                        <span
                          className={
                            row.type === "income"
                              ? "text-emerald-400"
                              : row.type === "transfer"
                              ? "text-zinc-400"
                              : "text-zinc-200"
                          }
                        >
                          {row.type === "income"
                            ? "+"
                            : row.type === "transfer"
                            ? "⇄ "
                            : "-"}
                          ${row.amount.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 sm:px-4 text-right opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity whitespace-nowrap">
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
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-white/[0.05] px-4 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-zinc-500">
            {selectedIds.size > 0
              ? `${selectedIds.size} of ${filtered.length} selected (Tip: Hold Shift to select a range)`
              : "Tip: Use checkboxes or Shift+Click to select multiple transactions"}
          </p>
          <p className="text-[11px] text-zinc-500 tabular-nums">
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
