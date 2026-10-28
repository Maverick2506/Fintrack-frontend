import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { billOptions } from "../../utils/planningAlerts";
import { formatShortDate } from "../../utils/formatUtils";

// Sinking fund: the bill a savings goal saves for. Picking one fills an empty target amount with the
// bill's amount (onPick); an empty target date follows the bill's next date on the server.
const LinkedBillField = ({ id, value, onChange, onPick, targetDate }) => {
  const [bills, setBills] = useState([]);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    dashboardService
      .fetchSubscriptions()
      .then((data) => {
        if (!cancelled) setBills(billOptions(data?.subscriptions));
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        {showUnknown && <option value={value}>Current bill</option>}
        {bills.map((b) => (
          <option key={b.value} value={b.value}>
            {b.label}
          </option>
        ))}
      </select>
      <p className="text-[11px] text-zinc-500 mt-1.5">
        {loadError
          ? "Couldn't load your bills."
          : value
          ? `Safe to Spend sets the monthly amount aside.${
              !targetDate && picked?.nextDate ? ` With no target date, it's the bill's next date (${formatShortDate(picked.nextDate)}).` : ""
            }`
          : "Link a bill to save for it month by month (a sinking fund)."}
      </p>
    </div>
  );
};

export default LinkedBillField;
