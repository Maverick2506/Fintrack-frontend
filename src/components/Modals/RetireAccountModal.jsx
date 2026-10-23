import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, X, Repeat, Check } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import useEscapeClose from "../../hooks/useEscapeClose";
import {
  ADJUST_REASONS,
  describeDeleteImpact,
  describeUnpaidItem,
  buildRetirePayload,
} from "../../utils/accountRetire";

// Archive (default) or permanently delete a card, debt or savings goal. Loads what still uses it
// (recurring series, overdue and upcoming bills, its balance) so nothing is left behind by accident.
// Archive stays disabled until the balance is $0, so net worth never loses money silently.
// Mount it only while open, so each open starts from fresh choices.
const RetireAccountModal = ({ account, onClose, onConfirm, onChanged }) => {
  const [seriesChoice, setSeriesChoice] = useState(null);
  const [submittingMode, setSubmittingMode] = useState(null);
  const [busyAction, setBusyAction] = useState(null);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustReason, setAdjustReason] = useState(null);
  const [changed, setChanged] = useState(false);

  // The page refreshes its list once the dialog closes, so it never unmounts the dialog mid-way
  const handleClose = () => {
    onClose();
    if (changed) onChanged?.();
  };

  useEscapeClose(true, handleClose);

  const {
    data: impact,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["deleteImpact", account?.id],
    queryFn: () => dashboardService.fetchDeleteImpact(account.id),
    enabled: Boolean(account?.id),
    staleTime: 0,
    gcTime: 0,
  });

  const summary = describeDeleteImpact(impact);
  const effectiveSeriesChoice =
    seriesChoice ?? (summary.canMove ? "moveToChecking" : "end");
  const noun = summary.noun;
  const isBusy = Boolean(submittingMode || busyAction);

  // Final payment, adjust to $0 and mark paid change the balance or the bills, so reload both
  const runAction = async (key, action) => {
    if (isBusy) return;
    setBusyAction(key);
    try {
      await action();
      setShowAdjust(false);
      setAdjustReason(null);
      setChanged(true);
      await refetch();
    } catch {
      // The request helper already showed the error
    } finally {
      setBusyAction(null);
    }
  };

  const submit = async (mode) => {
    if (isBusy || !summary.canRetire) return;
    setSubmittingMode(mode);
    try {
      await onConfirm(buildRetirePayload({ mode, seriesChoice: effectiveSeriesChoice }));
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

  const renderUnpaidRow = (item) => (
    <li key={item.id} className="flex items-center gap-2 min-h-10 py-1">
      <span className="min-w-0 flex-1">
        <span className="block text-xs text-zinc-200 truncate" title={item.title}>
          {item.title}
        </span>
        <span className="block text-[11px] text-zinc-500 tabular-nums whitespace-nowrap">
          {describeUnpaidItem(item)}
        </span>
      </span>
      {item.overdue && (
        <button
          type="button"
          onClick={() =>
            runAction(`paid-${item.id}`, () => dashboardService.markBillAsPaid(item.id))
          }
          disabled={isBusy}
          className="btn-secondary min-h-10 flex-shrink-0 disabled:opacity-50"
        >
          <Check size={13} />
          <span>{busyAction === `paid-${item.id}` ? "Saving…" : "Mark paid"}</span>
        </button>
      )}
    </li>
  );

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-3 sm:p-4 z-50"
      onClick={() => {
        // A tap outside while saving would hide the result half-way
        if (!isBusy) handleClose();
      }}
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
            onClick={handleClose}
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
            Couldn&apos;t load what uses this {noun}. Close this and try again.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.balanceLine && (
              <div className="rounded-xl border border-white/[0.08] p-3">
                <p className="text-xs text-zinc-200 tabular-nums">{summary.balanceLine}</p>
                <div className="flex flex-col sm:flex-row gap-2 mt-2.5">
                  {summary.finalPaymentLabel && (
                    <button
                      type="button"
                      onClick={() =>
                        runAction("final", () => dashboardService.recordFinalPayment(account.id))
                      }
                      disabled={isBusy}
                      className="btn-secondary min-h-10 w-full sm:w-auto tabular-nums disabled:opacity-50"
                    >
                      {busyAction === "final" ? "Saving…" : summary.finalPaymentLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowAdjust((v) => !v)}
                    disabled={isBusy}
                    aria-expanded={showAdjust}
                    className="btn-secondary min-h-10 w-full sm:w-auto disabled:opacity-50"
                  >
                    Adjust to $0
                  </button>
                </div>
                {showAdjust && (
                  <fieldset className="mt-3 space-y-2">
                    <legend className="text-[11px] text-zinc-400 mb-2">
                      Why? This records one adjustment and leaves Checking alone.
                    </legend>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {ADJUST_REASONS.map((r) => (
                        <label key={r.value} className={choiceClass(adjustReason === r.value)}>
                          <input
                            type="radio"
                            name="adjust-reason"
                            className="mt-0.5 accent-zinc-100 w-4 h-4 flex-shrink-0"
                            checked={adjustReason === r.value}
                            onChange={() => setAdjustReason(r.value)}
                          />
                          <span className="text-xs text-zinc-100">{r.label}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        runAction("adjust", () =>
                          dashboardService.adjustBalanceToZero(account.id, adjustReason)
                        )
                      }
                      disabled={!adjustReason || isBusy}
                      className="btn-secondary min-h-10 w-full disabled:opacity-50"
                    >
                      {busyAction === "adjust" ? "Saving…" : "Record adjustment"}
                    </button>
                  </fieldset>
                )}
              </div>
            )}

            {summary.unpaidCountsLine && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
                <p className="text-xs font-medium text-amber-200">
                  Unpaid: {summary.unpaidCountsLine}
                </p>
                {summary.overdueItems.length > 0 && (
                  <>
                    <p className="text-[11px] font-medium text-amber-300 uppercase tracking-wider mt-2.5">
                      Overdue
                    </p>
                    <ul className="divide-y divide-white/[0.05]">
                      {summary.overdueItems.map(renderUnpaidRow)}
                    </ul>
                  </>
                )}
                {summary.upcomingItems.length > 0 && (
                  <>
                    <p className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider mt-2.5">
                      Upcoming
                    </p>
                    <ul className="divide-y divide-white/[0.05]">
                      {summary.upcomingItems.map(renderUnpaidRow)}
                    </ul>
                  </>
                )}
              </div>
            )}

            {summary.hasCommitments && (
              <fieldset className="space-y-2">
                <legend className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2">
                  What should happen to them?
                </legend>
                {summary.usedBy && (
                  <p className="text-xs text-zinc-300 leading-relaxed flex gap-2 mb-2">
                    <Repeat size={13} className="flex-shrink-0 mt-0.5" />
                    <span className="min-w-0 break-words">{summary.usedBy}.</span>
                  </p>
                )}
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
                      Unpaid ones are removed and repeating ones stop.
                    </span>
                  </span>
                </label>
              </fieldset>
            )}
          </div>
        )}

        <p className="text-[11px] text-zinc-500 leading-relaxed mt-4">
          Archive hides it everywhere and keeps its history in the Ledger. Delete permanently also
          removes its name from past transactions.
        </p>

        {!isLoading && !isError && !summary.canRetire && (
          <p className="text-[11px] text-amber-300 mt-2" role="status">
            Archive and delete are available once the balance is $0.
          </p>
        )}

        <div className="flex flex-col sm:flex-row-reverse gap-2 mt-4">
          <button
            type="button"
            onClick={() => submit("archive")}
            disabled={!summary.canRetire || isBusy}
            className="btn-primary min-h-10 w-full sm:w-auto"
          >
            <Archive size={14} />
            <span>{submittingMode === "archive" ? "Archiving…" : "Archive"}</span>
          </button>
          <button
            type="button"
            onClick={() => submit("delete")}
            disabled={!summary.canRetire || isBusy}
            className="min-h-10 w-full sm:w-auto px-3.5 py-1.5 bg-transparent hover:bg-rose-500/10 text-rose-400 border border-rose-500/25 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submittingMode === "delete" ? "Deleting…" : "Delete permanently"}
          </button>
          <button
            type="button"
            onClick={handleClose}
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
