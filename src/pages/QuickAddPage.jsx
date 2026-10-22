import { useState, useEffect, useRef } from "react";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  Tag,
  History,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import toast from "react-hot-toast";
import dashboardService from "../services/dashboardService";
import { parseQuickAdd } from "../utils/quickAddParser";
import { formatCurrency } from "../utils/formatUtils";

const RECENT_KEY = "fintrack_recent_quick_add";

const QuickAddPage = () => {
  const [input, setInput] = useState("");
  const [creditCards, setCreditCards] = useState([]);
  const [recentChips, setRecentChips] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef(null);
  // Keeps the same clientRef when the same entry is retried (e.g. after a timeout during a cold start),
  // so the server can recognise a save that already landed instead of storing it twice (N2)
  const pendingRef = useRef(null);

  useEffect(() => {
    // Load credit cards for fuzzy matching
    dashboardService
      .fetchCreditCards()
      .then((cards) => setCreditCards(cards || []))
      .catch((err) => console.error("Could not fetch cards:", err));

    // Load recent quick-add entries from localStorage
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        setRecentChips(JSON.parse(stored));
      } else {
        setRecentChips([
          "23.40 lunch visa",
          "120 hydro due 11/05",
          "+2100 paycheque",
          "4.50 coffee",
          "15.99 netflix amex",
        ]);
      }
    } catch {
      // Ignore localStorage errors
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const parsed = parseQuickAdd(input, creditCards);

  const saveRecentChip = (entryText) => {
    try {
      const existing = recentChips.filter(
        (c) => c.toLowerCase() !== entryText.toLowerCase()
      );
      const updated = [entryText, ...existing].slice(0, 5);
      setRecentChips(updated);
      localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
    } catch {
      // Ignore localStorage error
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!parsed.isValid || isSubmitting) return;

    setIsSubmitting(true);
    const entry = input.trim();
    if (!pendingRef.current || pendingRef.current.entry !== entry) {
      pendingRef.current = { entry, clientRef: crypto.randomUUID() };
    }
    const { clientRef } = pendingRef.current;

    try {
      if (parsed.type === "income") {
        await dashboardService.addPaycheque({
          name: parsed.name,
          amount: parsed.amount,
          payment_date: parsed.date,
          recurrence: "none",
          clientRef,
        });
      } else {
        await dashboardService.addExpense({
          name: parsed.name,
          amount: parsed.amount,
          due_date: parsed.date,
          category: parsed.category,
          creditCardId: parsed.creditCardId,
          is_paid: parsed.is_paid,
          applyToBalance: parsed.applyToBalance,
          recurrence: "none",
          clientRef,
        });
      }

      toast.success(
        parsed.type === "income"
          ? `Recorded income: ${formatCurrency(parsed.amount)}`
          : `Saved: ${parsed.name} (${formatCurrency(parsed.amount)})`
      );

      pendingRef.current = null;
      saveRecentChip(entry);
      setInput("");
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      console.error("Quick add failed:", err);
      toast.error(err?.response?.data?.error || "Could not save transaction");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChipClick = (chip) => {
    setInput(chip);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
          <Zap size={16} />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">
            Quick Add
          </h1>
          <p className="text-xs text-zinc-400">
            Natural language expense & income entry in one tap.
          </p>
        </div>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="glass-panel p-4 sm:p-5 relative focus-within:border-emerald-500/40 transition-colors">
          <label
            htmlFor="quickInput"
            className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-2"
          >
            Enter expense or income
          </label>
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              id="quickInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. 23.40 lunch visa, 120 hydro due 11/05"
              className="w-full bg-transparent text-base sm:text-lg text-zinc-100 placeholder-zinc-600 focus:outline-none"
              autoComplete="off"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="text-xs text-zinc-500 hover:text-zinc-300 px-1.5 py-0.5 rounded"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Live Parsed Preview */}
        {input.trim() ? (
          <div
            className={`glass-panel p-4 transition-all duration-200 border ${
              parsed.isValid
                ? "border-emerald-500/30 bg-emerald-950/10"
                : "border-white/[0.08]"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                    parsed.type === "income"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                      : "bg-rose-500/10 text-rose-300 border-rose-500/25"
                  }`}
                >
                  {parsed.type === "income" ? (
                    <span className="flex items-center gap-1">
                      <TrendingUp size={11} /> Income
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <TrendingDown size={11} /> Expense
                    </span>
                  )}
                </span>
                <span className="font-semibold text-zinc-100 text-sm">
                  {parsed.name}
                </span>
              </div>

              <div className="text-right">
                <span className="text-xl font-bold tabular-nums text-zinc-100">
                  {parsed.amount !== null
                    ? formatCurrency(parsed.amount)
                    : "$ —"}
                </span>
              </div>
            </div>

            {/* Details Pills */}
            <div className="flex flex-wrap gap-2 text-[11px] pt-2 border-t border-white/[0.06]">
              {/* Category */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">
                <Tag size={11} className="text-zinc-500" />
                {parsed.category}
              </span>

              {/* Account */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">
                {parsed.creditCardId ? (
                  <CreditCard size={11} className="text-sky-400" />
                ) : (
                  <Building size={11} className="text-zinc-500" />
                )}
                {parsed.accountName}
              </span>

              {/* Date & Cleared status */}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-white/[0.06] text-zinc-300">
                <Calendar size={11} className="text-zinc-500" />
                {parsed.date} ({parsed.is_paid ? "Paid" : "Unpaid bill"})
              </span>
            </div>

            {!parsed.isValid && (
              <p className="text-[11px] text-amber-400/90 mt-2">
                ⚠️ Enter an amount (e.g., 23.40) and a name to save.
              </p>
            )}
          </div>
        ) : (
          <div className="glass-panel p-4 text-xs text-zinc-500 space-y-1">
            <p className="font-medium text-zinc-400">💡 Natural language tips:</p>
            <ul className="list-disc list-inside space-y-0.5 text-zinc-500 text-[11px]">
              <li>Type <code className="text-zinc-300 font-mono">23.40 lunch visa</code> for a card purchase.</li>
              <li>Type <code className="text-zinc-300 font-mono">120 hydro due 11/05</code> for an upcoming unpaid bill.</li>
              <li>Type <code className="text-zinc-300 font-mono">+2100 paycheque</code> to record income.</li>
              <li>Specify checking with <code className="text-zinc-300 font-mono">debit</code> or <code className="text-zinc-300 font-mono">checking</code>.</li>
            </ul>
          </div>
        )}

        {/* Big Save Button */}
        <button
          type="submit"
          disabled={!parsed.isValid || isSubmitting}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg ${
            parsed.isValid && !isSubmitting
              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer shadow-emerald-500/20 active:scale-[0.99]"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/[0.06]"
          }`}
        >
          {isSubmitting ? (
            <span>Saving...</span>
          ) : (
            <>
              <CheckCircle2 size={16} />
              <span>
                Save {parsed.type === "income" ? "Income" : "Expense"}{" "}
                {parsed.amount ? `(${formatCurrency(parsed.amount)})` : ""}
              </span>
              <ArrowRight size={14} />
            </>
          )}
        </button>
      </form>

      {/* Recent Chips */}
      {recentChips.length > 0 && (
        <div className="mt-8 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mb-3">
            <History size={13} />
            <span>Recent Quick Entries (Tap to repeat)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentChips.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.06] text-xs text-zinc-300 hover:text-zinc-100 hover:border-white/20 transition-all cursor-pointer truncate max-w-full"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAddPage;
