import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, X, Repeat } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import useEscapeClose from "../../hooks/useEscapeClose";
import { formatCurrency } from "../../utils/formatUtils";
import { describeDeleteImpact, buildRetirePayload } from "../../utils/accountRetire";

// Archive (default) or permanently delete a card, debt or savings goal. Loads what still uses it
// (recurring series, unpaid bills, a goal's money) so nothing is left behind by accident.
// Mount it only while open, so each open starts from fresh choices.
const RetireAccountModal = ({ account, onClose, onConfirm }) => {
  const [seriesChoice, setSeriesChoice] = useState(null);
  const [moveBalance, setMoveBalance] = useState(true);
  const [submittingMode, setSubmittingMode] = useState(null);

  useEscapeClose(true, onClose);

  const {
    data: impact,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["deleteImpact", account?.id],
    queryFn: () => dashboardService.fetchDeleteImpact(account.id),
    enabled: Boolean(account?.id),
    staleTime: 0,
    gcTime: 0,
  });

  const summary = describeDeleteImpact(impact || { type: account?.type });
  const effectiveSeriesChoice =
    seriesChoice ?? (summary.canMove ? "moveToChecking" : "end");
  const noun = summary.noun;

  const submit = async (mode) => {
    if (submittingMode) return;
    setSubmittingMode(mode);
    try {
      await onConfirm(
        buildRetirePayload({
          mode,
          seriesChoice: effectiveSeriesChoice,
          moveBalance: summary.goalBalance > 0 && moveBalance,
        })
      );
    } catch {
      // The request helper already showed the error; keep the dialog open to retry
      setSubmittingMode(null);
    }
  };

  const choiceClass = (selected) =>
    `flex items-start gap-3 min-h-10 p-3 rounded-xl border cursor-pointer transition-colors ${
      selected
        ? "border-white/25 bg-white/[0.05]"
        : "border-white/[0.08] hover:border-white/[0.15]"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-3 sm:p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="retire-dialog-title"
        className="bg-zinc-900 border border-white/[0.09] p-4 sm:p-5 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-300 flex-shrink-0">
              <Archive size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="retire-dialog-title" className="text-sm font-semibold text-zinc-100">
                Remove this {noun}?
              </h2>
              <p className="text-xs text-zinc-400 truncate" title={account?.name}>
                {account?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost-icon w-10 h-10 flex items-center justify-center flex-shrink-0 -mr-2 -mt-2"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {isLoading ? (
          <p className="text-xs text-zinc-500 py-3">Checking what uses this {noun}…</p>
        ) : isError ? (
          <p className="text-xs text-amber-300 py-2">
            Couldn&apos;t load what uses this {noun}. Its upcoming unpaid bills and repeating charges will be ended.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.hasCommitments && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <p className="text-xs text-amber-200 leading-relaxed flex gap-2">
                  <Repeat size={13} className="flex-shrink-0 mt-0.5" />
                  <span className="min-w-0 break-words">{summary.usedBy}.</span>
                </p>
                {impact?.unpaid?.count > 0 && (
                  <p className="text-[11px] text-zinc-400 mt-1.5 pl-5 tabular-nums">
                    {impact.unpaid.count} unpaid, {formatCurrency(impact.unpaid.total)} in total
                  </p>
                )}
              </div>
            )}

            {summary.hasCommitments && (
              <fieldset className="space-y-2">
                <legend className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  What should happen to them?
                </legend>
                {summary.canMove && (
                  <label className={choiceClass(effectiveSeriesChoice === "moveToChecking")}>
                    <input
                      type="radio"
                      name="retire-series"
                      className="mt-0.5 accent-zinc-100 w-4 h-4 flex-shrink-0"
                      checked={effectiveSeriesChoice === "moveToChecking"}
                      onChange={() => setSeriesChoice("moveToChecking")}
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-zinc-100">Move them to Checking</span>
                      <span className="block text-[11px] text-zinc-400 mt-0.5">
                        Charges keep coming, paid from Primary Checking.
                        {summary.endsAnyway && ` Payments to this ${noun} still end.`}
                      </span>
                    </span>
                  </label>
                )}
                <label className={choiceClass(effectiveSeriesChoice === "end")}>
                  <input
                    type="radio"
                    name="retire-series"
                    className="mt-0.5 accent-zinc-100 w-4 h-4 flex-shrink-0"
                    checked={effectiveSeriesChoice === "end"}
                    onChange={() => setSeriesChoice("end")}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-zinc-100">End them</span>
                    <span className="block text-[11px] text-zinc-400 mt-0.5">
                      Upcoming unpaid ones are removed and repeating ones stop.
                    </span>
                  </span>
                </label>
              </fieldset>
            )}

            {summary.owedLine && (
              <p className="text-xs text-zinc-300 leading-relaxed rounded-xl border border-white/[0.08] p-3 tabular-nums">
                {summary.owedLine}
              </p>
            )}

            {summary.goalBalanceLine && (
              <label className={choiceClass(moveBalance)}>
                <input
                  type="checkbox"
                  className="mt-0.5 accent-zinc-100 w-4 h-4 flex-shrink-0"
                  checked={moveBalance}
                  onChange={(e) => setMoveBalance(e.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block text-xs font-medium text-zinc-100 tabular-nums">
                    {summary.goalBalanceLine}
                  </span>
                  <span className="block text-[11px] text-zinc-400 mt-0.5">
                    {moveBalance
                      ? "Recorded as one transfer, so your net worth stays the same."
                      : "The money leaves your net worth with the goal."}
                  </span>
                </span>
              </label>
            )}
          </div>
        )}

        <p className="text-[11px] text-zinc-500 leading-relaxed mt-4">
          Archive hides it everywhere and keeps its history in the Ledger. Delete permanently also
          removes its name from past transactions.
        </p>

        <div className="flex flex-col sm:flex-row-reverse gap-2 mt-4">
          <button
            type="button"
            onClick={() => submit("archive")}
            disabled={isLoading || Boolean(submittingMode)}
            className="btn-primary min-h-10 w-full sm:w-auto"
          >
            <Archive size={14} />
            <span>{submittingMode === "archive" ? "Archiving…" : "Archive"}</span>
          </button>
          <button
            type="button"
            onClick={() => submit("delete")}
            disabled={isLoading || Boolean(submittingMode)}
            className="min-h-10 w-full sm:w-auto px-3.5 py-1.5 bg-transparent hover:bg-rose-500/10 text-rose-400 border border-rose-500/25 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {submittingMode === "delete" ? "Deleting…" : "Delete permanently"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary min-h-10 w-full sm:w-auto sm:mr-auto"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RetireAccountModal;
