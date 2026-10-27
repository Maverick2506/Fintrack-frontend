import { CalendarClock } from "lucide-react";
import { describeNextPay, describePayOverride, noIncomeNote } from "../../utils/payForecast";

// Under Safe to Spend: the next paycheque the forecast plans with, or, with no income in the
// forecast, the note and a "Set Expected pay" button. Both open the Expected pay sheet. A chosen pay
// name that isn't regular pay gets its own line with "Change".
const NextPayLine = ({ forecast, onOpen }) => {
  const line = describeNextPay(forecast);
  if (!line) return null;

  if (line.kind === "none") {
    return (
      <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] px-3 py-2">
        <p className="text-[11px] text-amber-200/90">{noIncomeNote(forecast)}</p>
        <button
          type="button"
          onClick={onOpen}
          className="mt-1 inline-flex items-center gap-1.5 min-h-10 text-xs font-medium text-amber-100 hover:text-white cursor-pointer"
        >
          <CalendarClock size={13} />
          Set Expected pay
        </button>
      </div>
    );
  }

  const override = describePayOverride(forecast);
  const payButton = (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${line.text}. Change Expected pay`}
      className="mt-1 flex items-center gap-1.5 w-full min-h-10 -mb-2 text-left text-[11px] text-zinc-400 hover:text-zinc-200 tabular-nums cursor-pointer"
    >
      <CalendarClock size={12} className="flex-shrink-0 text-zinc-500" />
      <span className="min-w-0">{line.text}</span>
    </button>
  );
  if (!override) return payButton;

  return (
    <>
      <p className="mt-2 text-[11px] text-amber-200/90">
        <span className="break-words">{override}</span> ·{" "}
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex items-center min-h-10 -my-3 font-medium text-amber-100 hover:text-white underline underline-offset-2 cursor-pointer"
        >
          Change
        </button>
      </p>
      {payButton}
    </>
  );
};

export default NextPayLine;
