import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { billOptions, oneOffBillOptions } from "../../utils/planningAlerts";
import { formatShortDate } from "../../utils/formatUtils";

// Sinking fund: the bill a savings goal saves for. An empty target amount and date follow the bill
// (its latest amount and next date) on the server; onPick gets the bill so the form can show them.
// currentTitle names a linked bill that is no longer in the list (ended).
const LinkedBillField = ({ id, value, onChange, onPick, targetDate, currentTitle }) => {
  const [series, setSeries] = useState([]);
  const [oneOffs, setOneOffs] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([dashboardService.fetchSubscriptions(), dashboardService.fetchOneOffBills()])
      .then(([subs, once]) => {
        if (cancelled) return;
        setSeries(billOptions(subs?.subscriptions));
        setOneOffs(oneOffBillOptions(once));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recurring bills, then one-time bills (a one-off is "bill:<id>" until it is linked)
  const bills = [...series, ...oneOffs];
  const picked = bills.find((b) => b.value === value);
  // A linked bill that is no longer running (ended) still shows, so saving doesn't unlink it
  const showUnknown = value && !picked;

  return (
    <div className="rounded-xl bg-zinc-950/60 border border-white/[0.06] px-3 py-2.5">
      <label
        htmlFor={id}
        className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-1 mb-1"
      >
        <Receipt size={11} /> Saving For A Bill (Optional)
      </label>
      <select
        id={id}
        value={value || ""}
        onChange={(e) => {
          const next = e.target.value || null;
          onChange(next);
          const option = bills.find((b) => b.value === next);
          if (option && onPick) onPick(option);
        }}
        className="w-full min-h-10 bg-zinc-900 border border-white/[0.08] text-xs font-medium text-zinc-200 rounded-lg px-2.5 focus:outline-none focus:border-zinc-700"
      >
        <option value="">No bill (regular goal)</option>
        {showUnknown && <option value={value}>{currentTitle || "Current bill"}</option>}
        {series.length > 0 && (
          <optgroup label="Recurring bills">
            {series.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </optgroup>
        )}
        {oneOffs.length > 0 && (
          <optgroup label="One-time bills">
            {oneOffs.map((b) => (
              <option key={b.value} value={b.value}>
                {b.label}
              </option>
            ))}
          </optgroup>
        )}
      </select>
      <p className="text-[11px] text-zinc-500 mt-1.5">
        {loadError
          ? "Couldn't load your bills."
          : value
          ? `The goal saves for this bill month by month; its card says how Safe to Spend covers it.${
              !targetDate && picked?.nextDate ? ` With no target date, it's the bill's next date (${formatShortDate(picked.nextDate)}).` : ""
            }`
          : "Link a bill to save for it month by month (a sinking fund)."}
      </p>
    </div>
  );
};

export default LinkedBillField;
