import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, X } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import useEscapeClose from "../../hooks/useEscapeClose";
import { formatCurrency, formatShortDate } from "../../utils/formatUtils";
import { getTorontoTodayStr } from "../../utils/dateUtils";
import { PAY_CADENCES, validateExpectedPay } from "../../utils/payForecast";

const cadenceLabel = (value) => PAY_CADENCES.find((c) => c.value === value)?.label.toLowerCase() || value;

// "Expected pay" sheet on the Safe to Spend card. Picks which income is the pay (pay_title) and sets
// Expected pay: next pay date, cadence and a planning amount, which the forecast uses only while
// there's no pay history. It creates no transactions. Mount it only while open.
const ExpectedPayModal = ({ onClose }) => {
  const { data: pay, isLoading } = useQuery({
    queryKey: ["pay-settings"],
    queryFn: () => dashboardService.fetchPaySettings(),
  });

  const todayStr = getTorontoTodayStr();
  const [form, setForm] = useState(null); // null until the user edits, so the saved values show first
  const [payTitle, setPayTitle] = useState(undefined);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);

  const saved = pay?.expectedPay;
  const values = form || {
    nextDate: saved?.nextDate && saved.nextDate >= todayStr ? saved.nextDate : "",
    cadence: saved?.cadence || "bi-weekly",
    amountRaw: saved ? String(saved.amount) : "",
  };
  const chosenTitle = payTitle === undefined ? pay?.payTitle || "" : payTitle;
  const titleChanged = pay && chosenTitle !== (pay.payTitle || "");
  const expectedTouched = Boolean(form) && (values.nextDate || values.amountRaw);
  const check = validateExpectedPay(values, todayStr);
  const canSave = !saving && (titleChanged || expectedTouched);

  const handleClose = () => {
    if (!saving) onClose();
  };
  useEscapeClose(true, handleClose);

  const update = (field, value) => setForm({ ...values, [field]: value });

  const run = async (work) => {
    setSaving(true);
    try {
      await work();
      onClose();
    } catch {
      // The request helper already showed the error; keep the sheet open to retry
      setSaving(false);
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!canSave) return;
    if (expectedTouched && !check.ok) {
      setShowErrors(true);
      return;
    }
    run(async () => {
      if (titleChanged) await dashboardService.updatePayTitle(chosenTitle || null);
      if (expectedTouched) await dashboardService.updateExpectedPay(check.payload);
    });
  };

  const series = pay?.paySeries;
  const fieldError = (field) =>
    showErrors && check.errors[field] ? (
      <p id={`expected-${field}-error`} className="text-[11px] text-rose-300 mt-1">
        {check.errors[field]}
      </p>
    ) : null;

  const choiceClass = (selected) =>
    `flex items-center justify-center min-h-10 px-2 rounded-xl border cursor-pointer text-xs text-center transition-colors ${
      selected
        ? "border-white/25 bg-white/[0.05] text-zinc-100"
        : "border-white/[0.08] text-zinc-400 hover:border-white/[0.15]"
    }`;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-end sm:items-center p-3 sm:p-4 z-50"
      onClick={handleClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="expected-pay-title"
        onSubmit={submit}
        noValidate
        className="bg-zinc-900 border border-white/[0.09] p-4 sm:p-5 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-300 flex-shrink-0">
              <CalendarClock size={16} />
            </div>
            <div className="min-w-0">
              <h2 id="expected-pay-title" className="text-sm font-semibold text-zinc-100">
                Expected pay
              </h2>
              <p className="text-xs text-zinc-400">How Safe to Spend counts your paycheques</p>
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
          <p className="text-xs text-zinc-400 py-6 text-center">Loading…</p>
        ) : (
          <>
            {series ? (
              <p className="text-xs text-zinc-300 bg-zinc-950/60 border border-white/[0.06] rounded-xl px-3 py-2.5 mb-4">
                Using your pay history: <span className="font-medium text-zinc-100 break-words">{series.label}</span>,{" "}
                {cadenceLabel(series.cadence)}, last {series.basedOn} paycheques{" "}
                <span className="tabular-nums whitespace-nowrap">
                  ({formatCurrency(series.range.min, { maximumFractionDigits: 0 })}–
                  {formatCurrency(series.range.max, { maximumFractionDigits: 0 })})
                </span>
                . Planning with{" "}
                <span className="font-medium text-zinc-100 tabular-nums whitespace-nowrap">
                  {formatCurrency(series.planningAmount)}
                </span>
                {saved ? ", so Expected pay isn't used." : "."}
              </p>
            ) : (
              <p className="text-xs text-zinc-400 mb-4">
                There isn't enough pay history yet. Set when you're paid next and a cautious amount, and the
                forecast counts it until 2 paycheques are logged. Nothing is added to your transactions.
              </p>
            )}

            {pay?.incomeNames?.length > 0 && (
              <div className="mb-4">
                <label htmlFor="pay-title" className="block text-xs text-zinc-300 mb-1.5">
                  Your pay is
                </label>
                <select
                  id="pay-title"
                  value={chosenTitle}
                  onChange={(e) => setPayTitle(e.target.value)}
                  disabled={saving}
                  className="w-full min-h-11 bg-zinc-950 border border-white/10 rounded-xl px-3 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-white/25"
                >
                  <option value="">Detect automatically</option>
                  {pay.incomeNames.map((n) => (
                    <option key={n.title} value={n.title}>
                      {n.label} · {n.count} in 120 days
                    </option>
                  ))}
                </select>
              </div>
            )}

            <fieldset className="space-y-3" disabled={saving}>
              <legend className="text-xs font-medium text-zinc-200 mb-2">
                Expected pay{saved && !pay?.expectedPayActive ? " (not used while you have pay history)" : ""}
              </legend>
              <div>
                <label htmlFor="expected-date" className="block text-xs text-zinc-300 mb-1.5">
                  Next pay date
                </label>
                <input
                  id="expected-date"
                  type="date"
                  min={todayStr}
                  value={values.nextDate}
                  onChange={(e) => update("nextDate", e.target.value)}
                  aria-invalid={Boolean(showErrors && check.errors.nextDate)}
                  aria-describedby={showErrors && check.errors.nextDate ? "expected-nextDate-error" : undefined}
                  className="w-full min-h-11 bg-zinc-950 border border-white/10 rounded-xl px-3 text-base sm:text-sm text-zinc-100 focus:outline-none focus:border-white/25 [color-scheme:dark]"
                />
                {fieldError("nextDate")}
              </div>

              <div role="radiogroup" aria-label="How often you're paid">
                <p className="text-xs text-zinc-300 mb-1.5">How often</p>
                <div className="grid grid-cols-3 gap-2">
                  {PAY_CADENCES.map((c) => (
                    <label key={c.value} className={choiceClass(values.cadence === c.value)}>
                      <input
                        type="radio"
                        name="expected-cadence"
                        className="sr-only"
                        checked={values.cadence === c.value}
                        onChange={() => update("cadence", c.value)}
                      />
                      <span>{c.label}</span>
                    </label>
                  ))}
                </div>
                {fieldError("cadence")}
              </div>

              <div>
                <label htmlFor="expected-amount" className="block text-xs text-zinc-300 mb-1.5">
                  Amount to plan with
                </label>
                <div className="flex items-center gap-2 bg-zinc-950 border border-white/10 rounded-xl px-3 min-h-11 focus-within:border-white/25">
                  <span className="text-sm text-zinc-500">$</span>
                  <input
                    id="expected-amount"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={values.amountRaw}
                    onChange={(e) => update("amountRaw", e.target.value)}
                    aria-invalid={Boolean(showErrors && check.errors.amount)}
                    aria-describedby="expected-amount-hint"
                    className="w-full min-w-0 bg-transparent text-base text-zinc-100 tabular-nums focus:outline-none py-2"
                    placeholder="0.00"
                  />
                </div>
                {fieldError("amount")}
                <p id="expected-amount-hint" className="text-[11px] text-zinc-500 mt-1">
                  Pay varies, so use a cautious amount, like a short week&apos;s cheque.
                </p>
              </div>
            </fieldset>

            {saved && (
              <p className="text-[11px] text-zinc-500 mt-3">
                Saved: {formatCurrency(saved.amount)} {cadenceLabel(saved.cadence)} from {formatShortDate(saved.nextDate)}.{" "}
                <button
                  type="button"
                  onClick={() => run(() => dashboardService.clearExpectedPay())}
                  disabled={saving}
                  className="inline-flex items-center min-h-10 text-rose-300 hover:text-rose-200 underline underline-offset-2 cursor-pointer disabled:opacity-50"
                >
                  Remove Expected pay
                </button>
              </p>
            )}
          </>
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
            disabled={!canSave}
            className="btn-primary min-h-10 w-full sm:w-auto disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpectedPayModal;
