import { useState } from "react";
import { RefreshCw, X } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import useEscapeClose from "../../hooks/useEscapeClose";
import { formatCurrency } from "../../utils/formatUtils";
import {
  SYNC_REASONS,
  describeStatementDifference,
  buildReconcilePayload,
} from "../../utils/statementSync";

// "Sync with statement" sheet for Checking, a card or a debt. Previews the difference, then records
// ONE Interest or Adjustment row for it, so the history explains the change.
// account: { id, name, type: "CHECKING" | "CREDIT_CARD" | "DEBT", balance }. Mount it only while open.
const SyncStatementModal = ({ account, onClose, onSynced }) => {
  const [actualRaw, setActualRaw] = useState("");
  // Debts default to Interest, but it only applies while the statement shows more owed
  const [reason, setReason] = useState(account?.type === "DEBT" ? "interest" : "adjustment");
  const [saving, setSaving] = useState(false);

  const handleClose = () => {
    if (!saving) onClose();
  };
  useEscapeClose(true, handleClose);

  const preview = describeStatementDifference({
    type: account?.type,
    appBalance: account?.balance,
    actualRaw,
  });

  const submit = async (e) => {
    e.preventDefault();
    if (!preview.canSave || saving) return;
    setSaving(true);
    try {
      await dashboardService.reconcileAccount(
        account.id,
        buildReconcilePayload({ actualRaw, reason, allowInterest: preview.allowInterest })
      );
      onSynced?.();
      onClose();
    } catch {
      // The request helper already showed the error; keep the sheet open to retry
      setSaving(false);
    }
  };

  const choiceClass = (selected) =>
    `flex items-center justify-center gap-2 min-h-10 px-3 rounded-xl border cursor-pointer text-xs transition-colors ${
      selected
        ? "border-white/25 bg-white/[0.05] text-zinc-100"
        : "border-white/[0.08] text-zinc-400 hover:border-white/[0.15]"
    }`;

  const toneClass =
    preview.tone === "up"
      ? account?.type === "CHECKING"
        ? "text-emerald-300"
        : "text-rose-300"
      : preview.tone === "down"
      ? account?.type === "CHECKING"
        ? "text-rose-300"
        : "text-emerald-300"
      : "text-zinc-400";

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-3 sm:p-4 z-50"
      onClick={handleClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-dialog-title"
        onSubmit={submit}
        className="bg-zinc-900 border border-white/[0.09] p-4 sm:p-5 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-300 flex-shrink-0">
              <RefreshCw size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="sync-dialog-title" className="text-sm font-semibold text-zinc-100">
                Sync with statement
              </h2>
              <p className="text-xs text-zinc-400 truncate" title={account?.name}>
                {account?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="btn-ghost-icon w-10 h-10 flex items-center justify-center flex-shrink-0 -mr-2 -mt-2"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        <label htmlFor="sync-actual" className="block text-xs text-zinc-300 mb-2">
          Your app shows{" "}
          <span className="font-semibold text-zinc-100 tabular-nums whitespace-nowrap">
            {formatCurrency(account?.balance)}
          </span>
          . What does your statement say?
        </label>
        <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 rounded-xl px-3 min-h-11 focus-within:border-white/25">
          <span className="text-sm text-zinc-500">$</span>
          <input
            id="sync-actual"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={actualRaw}
            onChange={(e) => setActualRaw(e.target.value)}
            className="w-full min-w-0 bg-transparent text-base text-zinc-100 tabular-nums focus:outline-none py-2"
            placeholder={Number(account?.balance || 0).toFixed(2)}
            autoFocus
            disabled={saving}
          />
        </div>

        <p className={`text-xs mt-3 min-h-8 tabular-nums ${toneClass}`} aria-live="polite">
          {preview.line}
        </p>

        {preview.canSave && !preview.allowInterest && (
          <p className="text-[11px] text-zinc-400 mt-2">Recorded as an adjustment.</p>
        )}

        {preview.allowInterest && (
          <fieldset className="mt-2">
            <legend className="text-[11px] text-zinc-400 mb-2">Record the difference as</legend>
            <div className="grid grid-cols-2 gap-2">
              {SYNC_REASONS.map((r) => (
                <label key={r.value} className={choiceClass(reason === r.value)}>
                  <input
                    type="radio"
                    name="sync-reason"
                    className="accent-zinc-100 w-4 h-4"
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    disabled={saving}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-5">
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="btn-secondary min-h-10 w-full sm:w-auto disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!preview.canSave || saving}
            className="btn-primary min-h-10 w-full sm:w-auto disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SyncStatementModal;
