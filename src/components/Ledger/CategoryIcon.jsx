import {
  ArrowLeftRight,
  Banknote,
  CalendarSync,
  Car,
  Check,
  CircleDashed,
  Clapperboard,
  HandCoins,
  House,
  Percent,
  PiggyBank,
  Undo2,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Utensils,
} from "lucide-react";
import { getCategoryStyle } from "../../constants/categories";

// Icon names used by CATEGORY_STYLES, INCOME_STYLE, TRANSFER_STYLE and DEFAULT_CATEGORY_STYLE
const ICONS = {
  ArrowLeftRight,
  Banknote,
  CalendarSync,
  Car,
  CircleDashed,
  Clapperboard,
  HandCoins,
  House,
  Percent,
  PiggyBank,
  Undo2,
  ShoppingBag,
  SlidersHorizontal,
  Tag,
  Utensils,
};

/** 32 px round icon at the start of a Ledger row. In selection mode it turns into the checkbox. */
const CategoryIcon = ({ category, type, selecting = false, selected = false }) => {
  if (selecting) {
    return (
      <span
        aria-hidden="true"
        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-colors ${
          selected
            ? "bg-zinc-100 border-zinc-100 text-zinc-950"
            : "border-white/25 bg-zinc-900/80"
        }`}
      >
        {selected && <Check size={15} strokeWidth={3} />}
      </span>
    );
  }
  const style = getCategoryStyle(category, type);
  const Icon = ICONS[style.icon] || CircleDashed;
  return (
    <span
      aria-hidden="true"
      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.tint}`}
    >
      <Icon size={15} strokeWidth={2} />
    </span>
  );
};

export default CategoryIcon;
