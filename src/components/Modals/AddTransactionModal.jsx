import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  X,
  Sparkles,
  Home,
  Repeat,
  Landmark,
  Utensils,
  Car,
  Film,
  ShoppingBag,
  MoreHorizontal,
  Calendar,
  CreditCard,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronDown,
  Check,
  CheckCircle2,
  Clock,
  Percent,
} from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { formatCurrency } from "../../utils/formatUtils";

const CATEGORY_CONFIG = [
  { name: "Essentials", icon: Home },
  { name: "Food & Drink", icon: Utensils },
  { name: "Shopping", icon: ShoppingBag },
  { name: "Subscription", icon: Repeat },
  { name: "Transportation", icon: Car },
  { name: "Entertainment", icon: Film },
  { name: "Debt", icon: Landmark },
  { name: "Other", icon: MoreHorizontal },
];

const RECURRENCE_OPTIONS = [
  { value: "none", label: "One-time", sub: "Does not repeat" },
  { value: "weekly", label: "Weekly", sub: "Every 7 days" },
  { value: "bi-weekly", label: "Bi-Weekly", sub: "Every 14 days" },
  { value: "monthly", label: "Monthly", sub: "Same day each month" },
  { value: "yearly", label: "Yearly", sub: "Once a year" },
];

const getLocalTodayStr = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const AddTransactionModal = ({
  isOpen,
  onClose,
  refreshData,
  existingTransaction,
}) => {
  const todayStr = getLocalTodayStr();
  const [amount, setAmount] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Essentials");
  const [dueDate, setDueDate] = useState(todayStr);
  const [paymentDate, setPaymentDate] = useState(todayStr);
  const [isPaid, setIsPaid] = useState(true);
  const [manualPaidOverride, setManualPaidOverride] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [hasManuallySelectedCategory, setHasManuallySelectedCategory] = useState(false);
  const [suggestedSource, setSuggestedSource] = useState(null); // "history" | "ai" | null
  const [recurrence, setRecurrence] = useState("none");
  const [selectedCard, setSelectedCard] = useState("");
  const [selectedTargetAccount, setSelectedTargetAccount] = useState("");
  const [isTaxExclusive, setIsTaxExclusive] = useState(false);
  const [taxRate, setTaxRate] = useState("13");
  const [openDropdown, setOpenDropdown] = useState(null); // "payment" | "schedule" | "paydown" | null
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const isEditing = !!existingTransaction;

  const { data: creditCards = [] } = useQuery({
    queryKey: ["creditCards"],
    queryFn: () => dashboardService.fetchCreditCards(),
    enabled: isOpen,
  });

  const { data: debts = [] } = useQuery({
    queryKey: ["debts"],
    queryFn: () => dashboardService.fetchDebts(),
    enabled: isOpen,
  });

  const { data: savingsGoals = [] } = useQuery({
    queryKey: ["savingsGoals"],
    queryFn: () => dashboardService.fetchSavingsGoals(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (isOpen) {
      setOpenDropdown(null);
      setManualPaidOverride(false);
      setError(null);
      if (isEditing) {
        setName(existingTransaction.name || existingTransaction.title || "");
        const isInc =
          existingTransaction.type === "income" ||
          existingTransaction.type === "INCOME" ||
          Boolean(
            existingTransaction.payment_date &&
              existingTransaction.category === "Income"
          );
        setType(isInc ? "income" : "expense");
        const initialAmount =
          existingTransaction.isTaxExclusive &&
          existingTransaction.baseAmount !== null &&
          existingTransaction.baseAmount !== undefined
            ? existingTransaction.baseAmount
            : existingTransaction.amount;
        setAmount(initialAmount);
        setCategory(existingTransaction.category || "Other");
        setHasManuallySelectedCategory(true);
        setSuggestedSource(null);
        const txDate =
          existingTransaction.due_date ||
          existingTransaction.payment_date ||
          existingTransaction.date ||
          todayStr;
        setDueDate(txDate);
        setPaymentDate(txDate);
        setIsPaid(
          existingTransaction.is_paid !== undefined
            ? Boolean(existingTransaction.is_paid)
            : existingTransaction.isCleared !== undefined
            ? Boolean(existingTransaction.isCleared)
            : txDate <= todayStr
        );
        setRecurrence(existingTransaction.recurrence || "none");
        setIsTaxExclusive(Boolean(existingTransaction.isTaxExclusive));
        setTaxRate(
          existingTransaction.taxRate !== null &&
          existingTransaction.taxRate !== undefined
            ? String(existingTransaction.taxRate)
            : "13"
        );
        setSelectedCard(existingTransaction.creditCardId || "");
        setSelectedTargetAccount(
          existingTransaction.targetAccountId ||
            existingTransaction.toAccountId ||
            ""
        );
      } else {
        setName("");
        setAmount("");
        setCategory("Essentials");
        setHasManuallySelectedCategory(false);
        setSuggestedSource(null);
        setDueDate(todayStr);
        setPaymentDate(todayStr);
        setIsPaid(true);
        setRecurrence("none");
        setIsTaxExclusive(false);
        setTaxRate("13");
        setSelectedCard("");
        setSelectedTargetAccount("");
        setType("expense");
      }
    }
  }, [existingTransaction, isOpen, isEditing, todayStr]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (openDropdown) {
          setOpenDropdown(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, openDropdown]);

  const handleDueDateChange = (newDate) => {
    setDueDate(newDate);
    if (!manualPaidOverride) {
      setIsPaid(newDate <= todayStr);
    }
  };

  // Real-time debounced auto-categorization (checks history first, then Gemini AI)
  useEffect(() => {
    if (
      !isOpen ||
      isEditing ||
      type !== "expense" ||
      hasManuallySelectedCategory
    ) {
      return;
    }

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setSuggestedSource(null);
      return;
    }

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setIsSuggesting(true);
        const res = await dashboardService.categorizeExpense(trimmed);
        if (isMounted && res?.category && !hasManuallySelectedCategory) {
          setCategory(res.category);
          setSuggestedSource(res.source || "ai");
        }
      } catch (err) {
        console.error("Debounced categorize error:", err);
      } finally {
        if (isMounted) setIsSuggesting(false);
      }
    }, 450);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [name, type, isOpen, isEditing, hasManuallySelectedCategory]);

  const handleSuggestCategory = async () => {
    if (!name) return;
    setIsSuggesting(true);
    try {
      const response = await dashboardService.categorizeExpense(name.trim());
      if (response?.category) {
        setCategory(response.category);
        setSuggestedSource(response.source || "ai");
      }
    } catch (error) {
      console.error("Error suggesting category:", error);
    } finally {
      setIsSuggesting(false);
    }
  };

  const paydownOptions = [
    ...debts
      .filter(
        (d) =>
          parseFloat(d.total_remaining ?? d.initialBalance ?? 0) > 0 ||
          (selectedTargetAccount && String(d.id) === String(selectedTargetAccount))
      )
      .map((d) => ({
        id: d.id,
        name: d.name,
        kind: "Debt",
        balance: parseFloat(d.total_remaining ?? d.initialBalance ?? 0),
      })),
    ...creditCards.map((c) => ({
      id: c.id,
      name: c.name,
      kind: "Credit Card",
      balance: parseFloat(c.currentBalance ?? c.initialBalance ?? 0),
    })),
  ];

  const activeTargetObj = paydownOptions.find(
    (p) => String(p.id) === String(selectedTargetAccount)
  );

  const activeSavingsGoal = savingsGoals.find(
    (g) =>
      String(g.id) ===
      String(
        selectedTargetAccount ||
          existingTransaction?.targetAccountId ||
          existingTransaction?.toAccountId
      )
  );

  const handleSelectTargetAccount = (opt) => {
    if (!opt) {
      setSelectedTargetAccount("");
    } else {
      setSelectedTargetAccount(opt.id);
      setSelectedCard(""); // Paydown comes from Primary Checking
      if (!name || name.startsWith("Payment for ")) {
        setName(`Payment for ${opt.name}`);
      }
    }
    setOpenDropdown(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Transaction title/name cannot be empty.");
      return;
    }
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid amount greater than 0.");
      return;
    }

    setIsSubmitting(true);
    try {
      const isExpense = type === "expense";

      const existingTargetId =
        selectedTargetAccount ||
        existingTransaction?.targetAccountId ||
        existingTransaction?.toAccountId ||
        null;

      const finalTargetAccountId =
        category === "Debt" || category === "Credit Card Payment"
          ? selectedTargetAccount || null
          : isEditing && category === existingTransaction?.category
          ? existingTargetId
          : null;

      const hasTarget = Boolean(finalTargetAccountId);

      const payload = isExpense
        ? {
            id: existingTransaction?.id,
            name: trimmedName,
            amount,
            baseAmount: isTaxExclusive ? parseFloat(amount) || 0 : null,
            due_date: dueDate,
            category,
            is_paid: isPaid,
            recurrence,
            isTaxExclusive,
            taxRate: isTaxExclusive ? parseFloat(taxRate) || 0 : null,
            creditCardId: hasTarget ? null : selectedCard || null,
            targetAccountId: finalTargetAccountId,
            paid_with_credit_card: hasTarget ? false : !!selectedCard,
          }
        : {
            id: existingTransaction?.id,
            name: trimmedName,
            amount,
            payment_date: paymentDate,
            category: "Income",
            recurrence,
          };

      await dashboardService.saveTransaction(payload, isEditing);

      onClose();
      refreshData();
    } catch (err) {
      console.error("Failed to save transaction:", err);
      const msg =
        err?.response?.data?.details?.[0]?.message ||
        err?.response?.data?.error ||
        err.message ||
        "Failed to save transaction.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const activeCardObj = creditCards.find(
    (c) => String(c.id) === String(selectedCard)
  );
  const activeRecurrenceObj =
    RECURRENCE_OPTIONS.find((r) => r.value === recurrence) ||
    RECURRENCE_OPTIONS[0];

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-50"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-tx-title"
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => {
          e.stopPropagation();
          if (openDropdown) setOpenDropdown(null);
        }}
      >
        {/* Top Header Bar with Type Switcher & Close Button */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <h2 id="add-tx-title" className="text-sm font-semibold text-zinc-200 tracking-tight">
            {isEditing ? "Edit Transaction" : "New Transaction"}
          </h2>

          <div className="flex items-center gap-2">
            {!isEditing && (
              <div className="inline-flex p-0.5 bg-zinc-950 border border-white/[0.08] rounded-lg">
                <button
                  type="button"
                  onClick={() => setType("expense")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                    type === "expense"
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <ArrowUpRight size={12} className="text-rose-400" />
                  <span>Expense</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("income")}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-all cursor-pointer ${
                    type === "income"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <ArrowDownLeft size={12} className="text-emerald-400" />
                  <span>Income</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-ghost-icon !p-1"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start gap-2">
              <span className="font-semibold text-rose-300">Error:</span>
              <span>{error}</span>
            </div>
          )}

          {/* Hero Amount + Merchant/Title Block */}
          <div className="bg-zinc-950/80 border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-1">
              <label
                htmlFor="amount"
                className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider"
              >
                {type === "expense" ? "Expense Amount" : "Income Amount"}
              </label>
              {category === "Debt" && activeTargetObj && !amount && (
                <button
                  type="button"
                  onClick={() => setAmount(activeTargetObj.balance.toFixed(2))}
                  className="text-[10px] text-rose-300 hover:text-rose-200 underline font-medium cursor-pointer"
                >
                  Pay Full ({formatCurrency(activeTargetObj.balance)})
                </button>
              )}
            </div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-semibold ${
                  type === "income" ? "text-emerald-400" : "text-zinc-400"
                }`}
              >
                {type === "income" ? "+$" : "$"}
              </span>
              <input
                type="number"
                id="amount"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                autoFocus
                required
                className={`w-full bg-transparent text-3xl font-semibold tracking-tight tabular-nums focus:outline-none placeholder:text-zinc-700 ${
                  type === "income" ? "text-emerald-400" : "text-zinc-100"
                }`}
              />
            </div>

            <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2">
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === "expense"
                    ? "What was this for? (e.g., Uber, Hydro, Groceries)"
                    : "Source (e.g., Paycheque, Freelance, Refund)"
                }
                required
                className="w-full bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
              {type === "expense" && (
                <button
                  type="button"
                  onClick={handleSuggestCategory}
                  disabled={isSuggesting || !name}
                  title="Auto-detect category with AI or past history"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-[11px] font-medium text-zinc-300 disabled:opacity-35 transition-colors shrink-0 cursor-pointer"
                >
                  <Sparkles
                    size={11}
                    className={
                      isSuggesting
                        ? "animate-spin text-indigo-400"
                        : "text-zinc-400"
                    }
                  />
                  <span>{isSuggesting ? "..." : "Auto"}</span>
                </button>
              )}
            </div>
          </div>

          {type === "expense" ? (
            <>
              {/* 1-Click Category Pill Grid */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                      Category
                    </span>
                    {suggestedSource === "history" && (
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-medium">
                        Matched from history
                      </span>
                    )}
                    {suggestedSource === "ai" && (
                      <span className="text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 flex items-center gap-1 font-medium">
                        <Sparkles size={10} /> AI suggested
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500">{category}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {CATEGORY_CONFIG.map((catItem) => {
                    const CatIcon = catItem.icon;
                    const catName = catItem.name;
                    const targetIsDebtOrCard = Boolean(activeTargetObj);
                    const active =
                      category === catName ||
                      (catName === "Debt" &&
                        (category === "Credit Card Payment" || targetIsDebtOrCard));
                    return (
                      <button
                        key={catName}
                        type="button"
                        onClick={() => {
                          setCategory(catName);
                          if (catName !== "Debt") {
                            setSelectedTargetAccount("");
                          }
                          setHasManuallySelectedCategory(true);
                          setSuggestedSource(null);
                        }}
                        className={`flex flex-col items-center justify-center gap-1 py-2 px-1.5 rounded-xl border text-[11px] font-medium transition-all cursor-pointer ${
                          active
                            ? "bg-zinc-100 text-zinc-950 border-zinc-100 shadow-sm"
                            : "bg-zinc-950/60 text-zinc-400 border-white/[0.06] hover:border-white/[0.15] hover:text-zinc-200"
                        }`}
                      >
                        <CatIcon size={14} strokeWidth={active ? 2 : 1.75} />
                        <span className="truncate max-w-full">
                          {catName === "Food & Drink"
                            ? "Food"
                            : catName === "Transportation"
                            ? "Transit"
                            : catName === "Subscription"
                            ? "Subs"
                            : catName === "Entertainment"
                            ? "Leisure"
                            : catName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Read-only target banner when editing a Savings Goal transfer */}
              {activeSavingsGoal && (
                <div className="bg-emerald-500/[0.06] border border-emerald-500/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center text-emerald-300 shrink-0">
                      <Wallet size={14} />
                    </div>
                    <div className="text-left truncate">
                      <p className="text-[10px] font-medium text-emerald-300/80 uppercase tracking-wider leading-none mb-1">
                        Contributes to Savings Goal
                      </p>
                      <p className="text-xs font-medium text-zinc-100 leading-none truncate">
                        {activeSavingsGoal.name}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 tabular-nums">
                    {formatCurrency(
                      activeSavingsGoal.current_amount ??
                        activeSavingsGoal.initialBalance ??
                        0
                    )}
                  </span>
                </div>
              )}

              {/* Pay Down Target Picker when Category === "Debt" or "Credit Card Payment" or target is debt/card */}
              {(category === "Debt" ||
                category === "Credit Card Payment" ||
                Boolean(activeTargetObj)) && (
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "paydown" ? null : "paydown"
                      )
                    }
                    className="w-full bg-rose-500/[0.06] hover:bg-rose-500/[0.1] border border-rose-500/20 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-rose-500/15 border border-rose-500/25 flex items-center justify-center text-rose-300 shrink-0">
                        {activeTargetObj?.kind === "Credit Card" ? (
                          <CreditCard size={14} />
                        ) : (
                          <Landmark size={14} />
                        )}
                      </div>
                      <div className="text-left truncate">
                        <p className="text-[10px] font-medium text-rose-300/80 uppercase tracking-wider leading-none mb-1">
                          {activeTargetObj?.kind === "Credit Card"
                            ? "Pays Credit Card"
                            : "Pay Towards (Debt / Card)"}
                        </p>
                        <p className="text-xs font-medium text-zinc-100 leading-none truncate">
                          {activeTargetObj
                            ? activeTargetObj.name
                            : "Select Debt or Credit Card to pay down..."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {activeTargetObj && (
                        <div className="text-right">
                          {parseFloat(amount) > 0 ? (
                            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 tabular-nums inline-block">
                              {formatCurrency(Math.max(0, activeTargetObj.balance - (parseFloat(amount) || 0)))} left
                              {parseFloat(amount) >= activeTargetObj.balance &&
                                " 🎉"}
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-md border border-white/[0.07] tabular-nums inline-block">
                              {formatCurrency(activeTargetObj.balance)} left
                            </span>
                          )}
                        </div>
                      )}
                      <ChevronDown
                        size={14}
                        className={`text-zinc-400 transition-transform ${
                          openDropdown === "paydown" ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {openDropdown === "paydown" && (
                    <div className="mt-1.5 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl p-1.5 space-y-1 max-h-52 overflow-y-auto z-50">
                      <button
                        type="button"
                        onClick={() => handleSelectTargetAccount(null)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                          !selectedTargetAccount
                            ? "bg-zinc-800/90 text-zinc-100 border border-white/[0.08]"
                            : "text-zinc-300 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div>
                          <p className="text-xs font-medium text-zinc-200">
                            General Debt Expense
                          </p>
                          <p className="text-[10px] text-zinc-500">
                            Record in expenses without linking a specific account
                          </p>
                        </div>
                        {!selectedTargetAccount && (
                          <Check size={14} className="text-emerald-400" />
                        )}
                      </button>

                      {paydownOptions.map((opt) => {
                        const isSelected =
                          String(selectedTargetAccount) === String(opt.id);
                        return (
                          <button
                            key={`${opt.kind}-${opt.id}`}
                            type="button"
                            onClick={() => handleSelectTargetAccount(opt)}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                              isSelected
                                ? "bg-zinc-800/90 text-zinc-100 border border-white/[0.08]"
                                : "text-zinc-300 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-md bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-rose-400">
                                {opt.kind === "Credit Card" ? (
                                  <CreditCard size={13} />
                                ) : (
                                  <Landmark size={13} />
                                )}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-zinc-100">
                                  {opt.name}
                                </p>
                                <p className="text-[10px] text-zinc-500 tabular-nums">
                                  {opt.kind} · {formatCurrency(opt.balance)} remaining
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check size={14} className="text-emerald-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Compact Metadata Grid: Date & Custom Schedule Dropdown */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-zinc-950/60 border border-white/[0.07] rounded-xl px-3 py-2">
                  <label
                    htmlFor="dueDate"
                    className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
                  >
                    <Calendar size={11} />
                    <span>Date</span>
                  </label>
                  <input
                    type="date"
                    id="dueDate"
                    value={dueDate}
                    onChange={(e) => handleDueDateChange(e.target.value)}
                    className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                    required
                  />
                </div>

                {/* Custom Schedule Picker */}
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "schedule" ? null : "schedule"
                      )
                    }
                    className="w-full h-full bg-zinc-950/60 hover:bg-zinc-950 border border-white/[0.07] hover:border-white/[0.14] rounded-xl px-3 py-2 text-left transition-colors cursor-pointer flex flex-col justify-between"
                  >
                    <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                      <Repeat size={11} />
                      <span>Schedule</span>
                    </span>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200">
                        {activeRecurrenceObj.label}
                      </span>
                      <ChevronDown
                        size={13}
                        className={`text-zinc-500 transition-transform ${
                          openDropdown === "schedule" ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {openDropdown === "schedule" && (
                    <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1 z-50 divide-y divide-white/[0.04]">
                      {RECURRENCE_OPTIONS.map((opt) => {
                        const isSelected = recurrence === opt.value;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setRecurrence(opt.value);
                              setOpenDropdown(null);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-white/[0.07] text-zinc-100"
                                : "text-zinc-300 hover:bg-white/[0.04]"
                            }`}
                          >
                            <div>
                              <p className="text-xs font-medium">{opt.label}</p>
                              <p className="text-[10px] text-zinc-500">
                                {opt.sub}
                              </p>
                            </div>
                            {isSelected && (
                              <Check size={13} className="text-emerald-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Custom Payment Method Picker (hidden if paying down a specific Debt/Card from Checking) */}
              {!(category === "Debt" && selectedTargetAccount) && (
                <div
                  className="relative"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === "payment" ? null : "payment"
                      )
                    }
                    className="w-full bg-zinc-950/60 hover:bg-zinc-950 border border-white/[0.07] hover:border-white/[0.14] rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-zinc-300">
                        {activeCardObj ? (
                          <CreditCard size={14} />
                        ) : (
                          <Wallet size={14} />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider leading-none mb-1">
                          Payment Method
                        </p>
                        <p className="text-xs font-medium text-zinc-100 leading-none">
                          {activeCardObj
                            ? activeCardObj.name
                            : "Primary Checking"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-zinc-500">
                        {activeCardObj ? "Credit Card" : "Direct Debit"}
                      </span>
                      <ChevronDown
                        size={14}
                        className={`text-zinc-500 transition-transform ${
                          openDropdown === "payment" ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {openDropdown === "payment" && (
                    <div className="mt-1.5 bg-zinc-950 border border-white/10 rounded-xl shadow-2xl p-1.5 space-y-1 max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCard("");
                          setOpenDropdown(null);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                          !selectedCard
                            ? "bg-zinc-800/90 text-zinc-100 border border-white/[0.08]"
                            : "text-zinc-300 hover:bg-white/[0.04] border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-6 h-6 rounded-md bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-emerald-400">
                            <Wallet size={13} />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-zinc-100">
                              Primary Checking
                            </p>
                            <p className="text-[10px] text-zinc-500">
                              Direct bank payment
                            </p>
                          </div>
                        </div>
                        {!selectedCard && (
                          <Check size={14} className="text-emerald-400" />
                        )}
                      </button>

                      {creditCards.length > 0 ? (
                        creditCards.map((card) => {
                          const isSelected =
                            String(selectedCard) === String(card.id);
                          const bal = parseFloat(card.currentBalance || 0);
                          const lim = parseFloat(card.creditLimit || 0);
                          return (
                            <button
                              key={card.id}
                              type="button"
                              onClick={() => {
                                setSelectedCard(card.id);
                                setOpenDropdown(null);
                              }}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all cursor-pointer ${
                                isSelected
                                  ? "bg-zinc-800/90 text-zinc-100 border border-white/[0.08]"
                                  : "text-zinc-300 hover:bg-white/[0.04] border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-6 h-6 rounded-md bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-zinc-300">
                                  <CreditCard size={13} />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-zinc-100">
                                    {card.name}
                                  </p>
                                  <p className="text-[10px] text-zinc-500 tabular-nums">
                                    {formatCurrency(bal)} used of {formatCurrency(lim, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} limit
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <Check size={14} className="text-emerald-400" />
                              )}
                            </button>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2 text-[11px] text-zinc-500 text-center">
                          No credit cards added yet — add one in the Cards tab.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Cleared / Pending Status Toggle */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-zinc-950/60 border border-white/[0.07]">
                <span className="flex items-center gap-2 text-xs text-zinc-300">
                  {isPaid ? (
                    <CheckCircle2 size={13} className="text-emerald-400" />
                  ) : (
                    <Clock size={13} className="text-amber-400" />
                  )}
                  <span>
                    {isPaid
                      ? "Paid / Cleared immediately"
                      : "Pending (Upcoming Bill)"}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setManualPaidOverride(true);
                    setIsPaid((v) => !v);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                    isPaid
                      ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                      : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  }`}
                >
                  {isPaid ? "Paid" : "Upcoming"}
                </button>
              </div>

              {/* Tax Exclusive on Due Date Toggle & Rate Selector */}
              <div className="rounded-xl bg-zinc-950/60 border border-white/[0.07] p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent size={13} className="text-amber-400" />
                    <div>
                      <span className="text-xs font-medium text-zinc-200 block">
                        Tax applied on due date
                      </span>
                      <span className="text-[10px] text-zinc-500 block">
                        Amount entered is exclusive of tax
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTaxExclusive((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isTaxExclusive ? "bg-amber-500" : "bg-zinc-800"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isTaxExclusive ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {isTaxExclusive && (
                  <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-zinc-400">Rate:</span>
                      <div className="flex items-center gap-1 bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 w-16">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={taxRate}
                          onChange={(e) => setTaxRate(e.target.value)}
                          className="w-full bg-transparent text-xs text-zinc-100 text-right focus:outline-none tabular-nums font-medium"
                        />
                        <span className="text-xs text-zinc-500">%</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {["5", "13", "15"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setTaxRate(preset)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                              taxRate === preset
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-white/[0.03] text-zinc-400 border-white/[0.06] hover:text-zinc-200"
                            }`}
                          >
                            {preset}%
                          </button>
                        ))}
                      </div>
                    </div>

                    {amount && !isNaN(parseFloat(amount)) && (
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 block leading-tight">
                          Total on due date:
                        </span>
                        <span className="text-xs font-semibold text-amber-300 tabular-nums">
                          {formatCurrency(parseFloat(amount) * (1 + (parseFloat(taxRate) || 0) / 100))}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-zinc-950/60 border border-white/[0.07] rounded-xl px-3 py-2.5">
                <label
                  htmlFor="paymentDate"
                  className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1"
                >
                  <Calendar size={11} />
                  <span>Deposit Date</span>
                </label>
                <input
                  type="date"
                  id="paymentDate"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-transparent text-xs text-zinc-200 focus:outline-none"
                  required
                />
              </div>

              {/* Schedule Picker for Income */}
              <div
                className="relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpenDropdown(
                      openDropdown === "schedule" ? null : "schedule"
                    )
                  }
                  className="w-full h-full bg-zinc-950/60 hover:bg-zinc-950 border border-white/[0.07] hover:border-white/[0.14] rounded-xl px-3 py-2 text-left transition-colors cursor-pointer flex flex-col justify-between"
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                    <Repeat size={11} />
                    <span>Schedule</span>
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-zinc-200">
                      {activeRecurrenceObj.label}
                    </span>
                    <ChevronDown
                      size={13}
                      className={`text-zinc-500 transition-transform ${
                        openDropdown === "schedule" ? "rotate-180" : ""
                      }`}
                    />
                  </div>
                </button>

                {openDropdown === "schedule" && (
                  <div className="absolute right-0 bottom-full mb-1.5 w-48 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl p-1 z-50 divide-y divide-white/[0.04]">
                    {RECURRENCE_OPTIONS.map((opt) => {
                      const isSelected = recurrence === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setRecurrence(opt.value);
                            setOpenDropdown(null);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-white/[0.07] text-zinc-100"
                              : "text-zinc-300 hover:bg-white/[0.04]"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-medium">{opt.label}</p>
                            <p className="text-[10px] text-zinc-500">
                              {opt.sub}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={13} className="text-emerald-400" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`btn-primary ${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isSubmitting
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : type === "income"
                ? "Record Income"
                : "Record Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddTransactionModal;
