import { CreditCard, Landmark, PiggyBank } from "lucide-react";

const CHIP_STYLES = {
  CREDIT_CARD: { icon: CreditCard, className: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  DEBT: { icon: Landmark, className: "text-rose-300 bg-rose-500/10 border-rose-500/20" },
  SAVINGS_GOAL: { icon: PiggyBank, className: "text-teal-300 bg-teal-500/10 border-teal-500/20" },
};

// Card, debt or goal a row uses, styled like the chips in Upcoming Bills
const AccountChip = ({ type, label, className = "" }) => {
  const style = CHIP_STYLES[type] || CHIP_STYLES.CREDIT_CARD;
  const Icon = style.icon;
  return (
    <span
      title={label}
      className={`inline-flex items-center gap-1 min-w-0 max-w-full text-[10px] font-medium border px-1.5 py-0.5 rounded ${style.className} ${className}`}
    >
      <Icon size={10} className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
};

export default AccountChip;
