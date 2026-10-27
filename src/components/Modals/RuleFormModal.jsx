import { useState, useEffect } from "react";
import { X, Wand2 } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { EXPENSE_CATEGORIES } from "../../constants/categories.js";
import useEscapeClose from "../../hooks/useEscapeClose";

const selectClass =
  "w-full min-w-0 h-11 bg-zinc-950 border border-white/[0.08] rounded-lg px-2.5 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-zinc-500";

/**
 * Add or edit a rule: titles containing `match` get this category and/or account.
 * initial: { id?, match, category, accountId, priority }. accounts: checking and cards
 * (GET /import/accounts). onSaved gets the saved rule.
 */
const RuleFormModal = ({ isOpen, onClose, initial, accounts = [], onSaved, sampleTitle }) => {
  const [match, setMatch] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [priority, setPriority] = useState("100");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  useEscapeClose(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setMatch(initial?.match || "");
    setCategory(initial?.category || "");
    setAccountId(initial?.accountId || "");
    setPriority(String(initial?.priority ?? 100));
    setError(null);
  }, [isOpen, initial]);

  if (!isOpen) return null;

  const trimmed = match.trim();
  const sampleMatches = sampleTitle && trimmed ? sampleTitle.toLowerCase().includes(trimmed.toLowerCase()) : null;
  const priorityNum = Number(priority);
  const canSave =
    trimmed.length > 0 && (category || accountId) && Number.isInteger(priorityNum) && priorityNum >= 0 && priorityNum <= 10000;

  const save = async (e) => {
    e.preventDefault();
    if (!canSave || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await dashboardService.saveRule({
        id: initial?.id,
        match: trimmed,
        category: category || null,
        accountId: accountId || null,
        priority: priorityNum,
      });
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const body = err?.response?.data;
      setError(body?.details?.[0]?.message || body?.error || "Could not save the rule.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-3 sm:p-4 z-50"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rule-dialog-title"
    >
      <form
        onSubmit={save}
        onClick={(e) => e.stopPropagation()}
        className="bg-zinc-900 border border-white/[0.09] p-4 sm:p-5 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300 shrink-0">
              <Wand2 size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="rule-dialog-title" className="text-sm font-semibold text-zinc-100">
                {initial?.id ? "Edit rule" : "New rule"}
              </h2>
              <p className="text-xs text-zinc-400">Used for imports, Quick Add and new transactions</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-ghost-icon w-10 h-10 flex items-center justify-center shrink-0 -mr-2 -mt-2"
          >
            <X size={16} />
          </button>
        </div>

        <label className="block mb-3">
          <span className="block text-xs text-zinc-300 mb-1.5">When the title contains</span>
          <input
            type="text"
            value={match}
            onChange={(e) => setMatch(e.target.value)}
            maxLength={100}
            autoFocus
            placeholder="e.g. tim hortons"
            className="w-full h-11 bg-zinc-950 border border-white/[0.08] rounded-lg px-3 text-base sm:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-500"
          />
          <span className="block text-[11px] text-zinc-500 mt-1">
            Upper and lower case don't matter.
            {sampleMatches === false && (
              <span className="text-amber-300/90"> “{sampleTitle}” doesn't contain this.</span>
            )}
          </span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <label className="block min-w-0">
            <span className="block text-xs text-zinc-300 mb-1.5">Set category</span>
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Don't change</option>
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block min-w-0">
            <span className="block text-xs text-zinc-300 mb-1.5">Paid with</span>
            <select className={selectClass} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              <option value="">Don't change</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="block mb-1">
          <span className="block text-xs text-zinc-300 mb-1.5">Priority</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={10000}
            step={1}
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-28 h-11 bg-zinc-950 border border-white/[0.08] rounded-lg px-3 text-base sm:text-sm text-zinc-100 tabular-nums focus:outline-none focus:border-zinc-500"
          />
          <span className="block text-[11px] text-zinc-500 mt-1">
            Lower numbers go first. When two rules match, the first one sets the category.
          </span>
        </label>

        {!category && !accountId && trimmed && (
          <p className="text-[11px] text-amber-300/90 mt-2">Pick a category, an account, or both.</p>
        )}
        {error && (
          <p className="text-xs text-rose-400 mt-2" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 w-full sm:w-auto">
            Cancel
          </button>
          <button type="submit" disabled={!canSave || saving} className="btn-primary min-h-10 w-full sm:w-auto disabled:opacity-50">
            {saving ? "Saving..." : initial?.id ? "Save rule" : "Add rule"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RuleFormModal;
