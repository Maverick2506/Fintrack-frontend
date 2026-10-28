import { fundUseDetail, fundUseLabel } from "../../utils/planningAlerts";

// Paying a card: one "Use $X from <fund>" box for each bill on it that a savings goal has money for
const FundBillsChecklist = ({ fundBills, checked, onToggle }) => {
  const offered = (fundBills || []).filter((fb) => fb.use > 0);
  if (offered.length === 0) return null;
  return (
    <div className="space-y-2">
      {offered.map((fb) => (
        <label
          key={fb.billId}
          className="flex items-start gap-3 rounded-xl border border-white/[0.08] p-3 min-h-10 cursor-pointer"
        >
          <input
            type="checkbox"
            checked={checked.has(fb.billId)}
            onChange={() => onToggle(fb.billId)}
            className="mt-0.5 w-4 h-4 accent-emerald-400 flex-shrink-0"
          />
          <span className="min-w-0">
            <span className="block text-xs font-medium text-zinc-100 break-words">{fundUseLabel(fb)}</span>
            <span className="block text-[11px] text-zinc-500 mt-0.5 break-words">{fundUseDetail(fb)}</span>
          </span>
        </label>
      ))}
    </div>
  );
};

export default FundBillsChecklist;
