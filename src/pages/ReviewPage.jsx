import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { ArrowLeft, Inbox, Check, Pencil, Wand2, Upload } from "lucide-react";
import dashboardService from "../services/dashboardService";
import AccountChip from "../components/Common/AccountChip";
import CategoryIcon from "../components/Ledger/CategoryIcon";
import AddTransactionModal from "../components/Modals/AddTransactionModal";
import RuleFormModal from "../components/Modals/RuleFormModal";
import { EXPENSE_CATEGORIES } from "../constants/categories.js";
import { formatCurrency, formatShortDate } from "../utils/formatUtils";
import { getLedgerAccountChip } from "../utils/accountRetire";
import { suggestRuleMatch } from "../utils/csvImport";

// "Review new": rows a bank import added, waiting for a look. Confirm keeps a row as it is;
// edit changes it; "Make a rule" teaches the category for next time.
const ReviewPage = () => {
  const [editingTx, setEditingTx] = useState(null);
  const [ruleFor, setRuleFor] = useState(null);
  const [busyIds, setBusyIds] = useState(new Set());

  // Ledger rows carry every field the edit form needs; the inbox is the ones still needing review
  const { data: ledger = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["reviewLedger"],
    queryFn: () => dashboardService.fetchLedger(),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["importAccounts"],
    queryFn: () => dashboardService.fetchImportAccounts(),
  });
  const rows = useMemo(() => ledger.filter((r) => r.needsReview), [ledger]);

  const confirm = async (ids) => {
    if (ids.length === 0) return;
    setBusyIds((prev) => new Set([...prev, ...ids]));
    try {
      await dashboardService.confirmReviewed(ids);
    } catch (err) {
      console.error("Confirm failed:", err);
    } finally {
      setBusyIds((prev) => new Set([...prev].filter((id) => !ids.includes(id))));
    }
  };

  // After a rule is added, rows waiting here that it matches take its category too
  const applyNewRule = async (rule) => {
    if (!rule?.category) return;
    const needle = rule.match.trim().toLowerCase();
    const ids = rows
      .filter((r) => r.type === "expense" && r.category !== rule.category && r.name.toLowerCase().includes(needle))
      .map((r) => r.id);
    if (ids.length === 0) return;
    try {
      await dashboardService.setCategoryOnRows(ids, rule.category);
      toast.success(`${ids.length} row${ids.length === 1 ? "" : "s"} here set to ${rule.category}`);
    } catch (err) {
      console.error("Applying the rule to review rows failed:", err);
    }
  };

  const amountText = (row) =>
    row.type === "income" ? `+${formatCurrency(row.amount)}` : row.type === "transfer" ? `⇄ ${formatCurrency(row.amount)}` : `-${formatCurrency(row.amount)}`;

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
        <Inbox size={18} className="text-zinc-400" />
        <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Review new</h1>
      </div>
      <p className="text-xs text-zinc-500 mt-1 mb-6">
        Rows from your bank imports. They already count in your balances and the Ledger; confirm
        each once it looks right. <Link to="/rules" className="text-zinc-300 underline underline-offset-2">Rules</Link>{" "}
        set categories for next time.
      </p>

      {isLoading ? (
        <div className="text-center text-zinc-500 text-sm p-12">Loading...</div>
      ) : isError ? (
        <div className="glass-panel p-6 text-center space-y-3">
          <p className="text-sm text-rose-400">Could not load the rows to review.</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary h-10 px-4">
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <Inbox size={22} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-300 font-medium">Nothing to review</p>
          <p className="text-xs text-zinc-500 mt-1 mb-4">Rows from a bank import show up here.</p>
          <Link to="/import" className="btn-secondary h-10 px-4">
            <Upload size={14} />
            <span>Import CSV</span>
          </Link>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-white/[0.06]">
            <span className="text-xs text-zinc-400">{rows.length} to review</span>
            <button
              type="button"
              onClick={() => confirm(rows.map((r) => r.id))}
              disabled={busyIds.size > 0}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/25 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
            >
              <Check size={13} />
              <span>Confirm all</span>
            </button>
          </div>
          <ul className="divide-y divide-white/[0.04]">
            {rows.map((row) => {
              const chip = getLedgerAccountChip(row);
              const busy = busyIds.has(row.id);
              return (
                <li key={row.id} className="px-3 py-2.5">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      <CategoryIcon category={row.category} type={row.type} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-zinc-100 break-words line-clamp-2">{row.name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-0.5 min-w-0">
                        <span className="text-[11px] text-zinc-500 tabular-nums">{formatShortDate(row.date)}</span>
                        <span className="text-[11px] text-zinc-500">· {row.category}</span>
                        {chip && <AccountChip type={chip.type} label={chip.label} className="max-w-[60%]" />}
                      </div>
                    </div>
                    <span
                      className={`text-sm font-medium tabular-nums whitespace-nowrap shrink-0 ${
                        row.type === "income" ? "text-emerald-400" : row.type === "transfer" ? "text-zinc-400" : "text-zinc-200"
                      }`}
                    >
                      {amountText(row)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-2 sm:flex sm:justify-end">
                    <button
                      type="button"
                      onClick={() => confirm([row.id])}
                      disabled={busy}
                      className="btn-secondary h-10 px-2.5 text-emerald-400 disabled:opacity-50"
                    >
                      <Check size={13} />
                      <span>Confirm</span>
                    </button>
                    <button type="button" onClick={() => setEditingTx(row)} className="btn-secondary h-10 px-2.5">
                      <Pencil size={13} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setRuleFor({
                          row,
                          initial: {
                            match: suggestRuleMatch(row.name),
                            category: EXPENSE_CATEGORIES.includes(row.category) ? row.category : "",
                            accountId: null,
                            priority: 100,
                          },
                        })
                      }
                      className="btn-secondary h-10 px-2.5"
                      title="Make a rule from this"
                    >
                      <Wand2 size={13} />
                      <span>
                        <span className="sm:hidden">Rule</span>
                        <span className="hidden sm:inline">Make a rule</span>
                      </span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AddTransactionModal
        isOpen={Boolean(editingTx)}
        onClose={() => setEditingTx(null)}
        refreshData={refetch}
        existingTransaction={editingTx}
      />
      <RuleFormModal
        isOpen={Boolean(ruleFor)}
        onClose={() => setRuleFor(null)}
        initial={ruleFor?.initial}
        sampleTitle={ruleFor?.row?.name}
        accounts={accounts}
        onSaved={(saved) => applyNewRule(saved)}
      />
    </div>
  );
};

export default ReviewPage;
