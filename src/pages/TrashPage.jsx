import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Trash2, RotateCcw, ArrowLeft, Check } from "lucide-react";
import dashboardService from "../services/dashboardService";
import AccountChip from "../components/Common/AccountChip";
import { TRANSACTIONS_RESTORED_EVENT } from "../components/Common/UndoDeleteToast";
import { formatNumber, formatShortDate } from "../utils/formatUtils";
import { getLedgerAccountChip } from "../utils/accountRetire";
import { purgeLabel, trashArchivedHint } from "../utils/undoDelete";

// Deleted transactions, kept for 30 days. Restore puts each row and its balance back.
const TrashPage = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [restoringIds, setRestoringIds] = useState(new Set());

  const loadTrash = useCallback(async () => {
    setError(null);
    try {
      const data = await dashboardService.fetchTrash();
      setRows(Array.isArray(data) ? data : []);
      setSelectedIds((prev) => new Set([...prev].filter((id) => data.some((r) => r.id === id))));
    } catch (err) {
      console.error("Failed to load trash:", err);
      setError(err?.response?.data?.error || "Could not load the Trash.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrash();
    // An Undo from a toast restores rows that may be on screen here
    window.addEventListener(TRANSACTIONS_RESTORED_EVENT, loadTrash);
    return () => window.removeEventListener(TRANSACTIONS_RESTORED_EVENT, loadTrash);
  }, [loadTrash]);

  const restore = async (ids) => {
    if (ids.length === 0) return;
    setRestoringIds((prev) => new Set([...prev, ...ids]));
    try {
      // Refreshes this list through TRANSACTIONS_RESTORED_EVENT
      await dashboardService.restoreTransactions(ids);
      setSelectedIds((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    } catch (err) {
      // handleRequest showed the error (e.g. 409 for an archived account)
      console.error("Restore failed:", err);
    } finally {
      setRestoringIds((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    }
  };

  const toggle = (id) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = rows.length > 0 && rows.every((r) => selectedIds.has(r.id));
  const selectedList = useMemo(() => rows.filter((r) => selectedIds.has(r.id)).map((r) => r.id), [rows, selectedIds]);

  const renderAmount = (row) => (
    <span
      className={
        row.type === "income" ? "text-emerald-400/80" : row.type === "transfer" ? "text-zinc-400" : "text-zinc-300"
      }
    >
      {row.type === "income" ? "+" : row.type === "transfer" ? "⇄ " : "-"}${formatNumber(row.amount)}
    </span>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-24">
      <Link
        to="/ledger"
        className="inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Ledger</span>
      </Link>
      <div className="flex items-center gap-2 mt-1">
        <Trash2 size={18} className="text-zinc-400" />
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Trash</h1>
      </div>
      <p className="text-xs text-zinc-500 mt-1 mb-6">
        Deleted transactions stay here for 30 days, then they are removed for good. Restore puts a
        transaction back with its card, debt and goal balances.
      </p>

      {loading ? (
        <div className="text-center text-zinc-500 text-sm p-12">Loading Trash...</div>
      ) : error ? (
        <div className="glass-panel p-6 text-center space-y-3">
          <p className="text-sm text-rose-400">{error}</p>
          <button type="button" onClick={loadTrash} className="btn-secondary h-10 px-4">
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <Trash2 size={22} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-300 font-medium">Trash is empty</p>
          <p className="text-xs text-zinc-500 mt-1">Transactions you delete show up here for 30 days.</p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-2 sm:px-3 py-1.5 border-b border-white/[0.06]">
            <button
              type="button"
              onClick={() => setSelectedIds(allSelected ? new Set() : new Set(rows.map((r) => r.id)))}
              className="inline-flex items-center gap-2 h-10 px-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center ${
                  allSelected ? "bg-zinc-100 border-zinc-100 text-zinc-950" : "border-white/20"
                }`}
              >
                {allSelected && <Check size={11} strokeWidth={3} />}
              </span>
              <span>{rows.length} deleted</span>
            </button>
            {selectedList.length > 0 && (
              <button
                type="button"
                onClick={() => restore(selectedList)}
                disabled={selectedList.some((id) => restoringIds.has(id))}
                className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
              >
                <RotateCcw size={13} />
                <span>Restore {selectedList.length}</span>
              </button>
            )}
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {rows.map((row) => {
              const isSelected = selectedIds.has(row.id);
              const chip = getLedgerAccountChip(row);
              const purge = purgeLabel(row.purgeAfter);
              const archivedHint = trashArchivedHint(row);
              const cannotRestore = row.restoreAction === "refuse";
              return (
                <li
                  key={row.id}
                  className={`flex items-center gap-1 pl-1 sm:pl-2 pr-2 sm:pr-3 py-1.5 min-h-14 ${
                    isSelected ? "bg-white/[0.04]" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    aria-label={isSelected ? `Unselect ${row.name}` : `Select ${row.name}`}
                    aria-pressed={isSelected}
                    className="w-10 h-10 shrink-0 flex items-center justify-center cursor-pointer"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected ? "bg-zinc-100 border-zinc-100 text-zinc-950" : "border-white/20"
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-zinc-300 block truncate" title={row.name}>
                      {row.name}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5 text-[11px] text-zinc-500 min-w-0">
                      {chip ? (
                        <AccountChip type={chip.type} label={chip.label} className="shrink" />
                      ) : (
                        <span className="text-zinc-400 truncate">{row.category}</span>
                      )}
                      <span>·</span>
                      <span className="tabular-nums shrink-0">{formatShortDate(row.date)}</span>
                    </div>
                    {archivedHint && (
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-[10px] min-w-0">
                        <span className="px-1.5 rounded border border-amber-500/25 bg-amber-500/10 text-amber-300 font-medium whitespace-nowrap">
                          Archived account
                        </span>
                        <span className={cannotRestore ? "text-amber-300/80" : "text-zinc-400"}>{archivedHint}</span>
                      </div>
                    )}
                    {purge && (
                      <span className="text-[10px] text-zinc-600 block mt-0.5">Removed for good on {purge}</span>
                    )}
                  </div>
                  <div className="text-right font-medium text-sm tabular-nums whitespace-nowrap shrink-0 pl-1">
                    {renderAmount(row)}
                  </div>
                  <button
                    type="button"
                    onClick={() => restore([row.id])}
                    disabled={restoringIds.has(row.id) || cannotRestore}
                    aria-label={`Restore ${row.name}`}
                    title={cannotRestore ? archivedHint : "Restore"}
                    className="shrink-0 ml-1 inline-flex items-center justify-center gap-1.5 h-10 min-w-10 px-2.5 sm:px-3 rounded-lg text-xs font-medium text-zinc-200 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={14} />
                    <span className="hidden sm:inline">Restore</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TrashPage;
