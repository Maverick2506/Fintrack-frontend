import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Wand2, Plus, Pencil, Trash2, CreditCard, Wallet } from "lucide-react";
import dashboardService from "../services/dashboardService";
import RuleFormModal from "../components/Modals/RuleFormModal";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";

// Rules: a title containing some text gets a category and/or account. They apply to bank imports,
// Quick Add and new transactions without a category, lowest priority number first.
const RulesPage = () => {
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const { data: rules = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["rules"],
    queryFn: () => dashboardService.fetchRules(),
  });
  const { data: accounts = [] } = useQuery({
    queryKey: ["importAccounts"],
    queryFn: () => dashboardService.fetchImportAccounts(),
  });
  const accountType = (id) => accounts.find((a) => a.id === id)?.type;

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await dashboardService.deleteRule(deleting.id);
    } catch (err) {
      console.error("Delete rule failed:", err);
    }
    setDeleting(null);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-24">
      <Link
        to="/import"
        className="inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
      >
        <ArrowLeft size={14} />
        <span>Import</span>
      </Link>
      <div className="flex items-center justify-between gap-3 mt-1">
        <div className="flex items-center gap-2 min-w-0">
          <Wand2 size={18} className="text-zinc-400 shrink-0" />
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Rules</h1>
        </div>
        <button type="button" onClick={() => setEditing({})} className="btn-primary h-10 px-3.5 shrink-0">
          <Plus size={14} />
          <span>Add rule</span>
        </button>
      </div>
      <p className="text-xs text-zinc-500 mt-1 mb-6">
        A rule sets the category or card for any title that contains its text. Rules run on bank
        imports, Quick Add, and new transactions without a category. Lower priority numbers go first.
      </p>

      {isLoading ? (
        <div className="text-center text-zinc-500 text-sm p-12">Loading rules...</div>
      ) : isError ? (
        <div className="glass-panel p-6 text-center space-y-3">
          <p className="text-sm text-rose-400">Could not load your rules.</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary h-10 px-4">
            Retry
          </button>
        </div>
      ) : rules.length === 0 ? (
        <div className="glass-panel p-10 text-center">
          <Wand2 size={22} className="mx-auto text-zinc-600 mb-2" />
          <p className="text-sm text-zinc-300 font-medium">No rules yet</p>
          <p className="text-xs text-zinc-500 mt-1">
            Add one here, or use “Make a rule” on a row in Review new.
          </p>
        </div>
      ) : (
        <ul className="glass-panel divide-y divide-white/[0.04] overflow-hidden">
          {rules.map((rule) => {
            const AccIcon = accountType(rule.accountId) === "CREDIT_CARD" ? CreditCard : Wallet;
            return (
              <li key={rule.id} className="flex items-center gap-2 pl-3 pr-1.5 py-2 min-h-14">
                <span
                  className="w-9 shrink-0 text-center text-[11px] font-medium text-zinc-500 tabular-nums"
                  title="Priority: lower goes first"
                >
                  {rule.priority}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-100 break-words">
                    <span className="text-zinc-500">Contains </span>“{rule.match}”
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                    {rule.category && (
                      <span className="text-[10px] font-medium border px-1.5 py-0.5 rounded text-violet-300 bg-violet-500/10 border-violet-500/20">
                        {rule.category}
                      </span>
                    )}
                    {rule.accountId && (
                      <span className="inline-flex items-center gap-1 min-w-0 max-w-full text-[10px] font-medium border px-1.5 py-0.5 rounded text-amber-300 bg-amber-500/10 border-amber-500/20">
                        <AccIcon size={10} className="shrink-0" />
                        <span className="truncate">{rule.accountName || "Archived account"}</span>
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditing(rule)}
                  aria-label={`Edit rule ${rule.match}`}
                  className="btn-ghost-icon w-10 h-10 flex items-center justify-center shrink-0"
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleting(rule)}
                  aria-label={`Delete rule ${rule.match}`}
                  className="btn-ghost-icon w-10 h-10 flex items-center justify-center shrink-0 hover:text-rose-400"
                >
                  <Trash2 size={15} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <RuleFormModal
        isOpen={Boolean(editing)}
        onClose={() => setEditing(null)}
        initial={editing}
        accounts={accounts}
      />
      <ConfirmDeleteModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        itemType="rule"
        itemName={deleting ? `Contains “${deleting.match}”` : ""}
        description="Rows it already categorized keep their category."
      />
    </div>
  );
};

export default RulesPage;
