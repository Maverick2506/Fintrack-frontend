import { useState, useEffect, useRef, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Zap,
  ArrowRight,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  Tag,
  History,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  Sparkles,
  SkipForward,
  X,
  CloudOff,
} from "lucide-react";
import toast from "react-hot-toast";
import dashboardService from "../services/dashboardService";
import { parseQuickAdd } from "../utils/quickAddParser";
import { applyRulesToQuickAdd } from "../utils/csvImport";
import { buildExampleChips, cleanRecentChips } from "../utils/quickAddExamples";
import { getTorontoTodayStr } from "../utils/dateUtils";
import { formatCurrency } from "../utils/formatUtils";
import { getClientRef } from "../utils/pendingSubmission";
import { shouldQueueSave, queueBadgeText } from "../utils/offlineQueue";
import { queueQuickAddSave } from "../services/offlineSync";
import useOfflineQueueCount from "../hooks/useOfflineQueueCount";
import ReceiptScanButton from "../components/Common/ReceiptScanButton";
import { receiptDraftToQuickAddText, receiptCategory, receiptDraftSummary, receiptDraftGaps } from "../utils/receiptDraft";
import {
  parseQuickAddTextParam,
  withoutTextParam,
  restoreLinkList,
  TEXT_PARAM,
} from "../utils/quickAddLink";

const RECENT_KEY = "fintrack_recent_quick_add";
// The link list in progress, so a reload or a re-login mid-list picks up where it left off
const LINK_LIST_KEY = "fintrack_quick_link_list";
const readStoredLinkList = () => {
  try {
    return restoreLinkList(sessionStorage.getItem(LINK_LIST_KEY));
  } catch {
    return null;
  }
};
// After this long, a save is probably waiting on a Render cold start, so say so
const SLOW_SAVE_MS = 8000;
// Last cards and rules seen, so Quick Add still knows "visa" and your rules when opened offline
const OFFLINE_CARDS_KEY = "fintrack_quick_cards";
const OFFLINE_RULES_KEY = "fintrack_quick_rules";
const readCached = (key) => {
  try {
    const list = JSON.parse(localStorage.getItem(key) || "null");
    return Array.isArray(list) ? list : undefined;
  } catch {
    return undefined;
  }
};
const writeCached = (key, list) => {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // Storage full or blocked: Quick Add still works online
  }
};
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

const QuickAddPage = () => {
  const [storedLink] = useState(readStoredLinkList);
  const [input, setInput] = useState(() => (storedLink ? storedLink.items[storedLink.index].text : ""));
  const [creditCards, setCreditCards] = useState(() => readCached(OFFLINE_CARDS_KEY) || []);
  // The last receipt read with the camera, while the input still holds its text (AI5)
  const [receipt, setReceipt] = useState(null);
  const queuedCount = useOfflineQueueCount();
  const [recentChips, setRecentChips] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlowSave, setIsSlowSave] = useState(false);
  const inputRef = useRef(null);
  // Keeps the same clientRef when the same entry is retried (e.g. after a timeout during a cold start),
  // so the server can recognise a save that already landed instead of storing it twice (N2)
  const pendingRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  // Entries from a Quick Add link (/quick?text=..., e.g. from the Gemini Gem), one per line.
  // They only fill the input, one at a time; each needs its own Save.
  const [linkItems, setLinkItems] = useState(() => (storedLink ? storedLink.items : []));
  const [linkIndex, setLinkIndex] = useState(() => (storedLink ? storedLink.index : 0));

  useEffect(() => {
    try {
      if (linkItems.length > 0) {
        sessionStorage.setItem(LINK_LIST_KEY, JSON.stringify({ items: linkItems, index: linkIndex }));
      } else {
        sessionStorage.removeItem(LINK_LIST_KEY);
      }
    } catch {
      // Ignore storage errors; the list still works for this page view
    }
  }, [linkItems, linkIndex]);

  useEffect(() => {
    if (!new URLSearchParams(location.search).has(TEXT_PARAM)) return;
    const lines = parseQuickAddTextParam(location.search);
    if (lines.length > 0) {
      setLinkItems(lines.map((text) => ({ text, status: "pending" })));
      setLinkIndex(0);
      setInput(lines[0]);
      pendingRef.current = null;
    }
    // Clear ?text= so a refresh or a shared screenshot of the URL doesn't bring it back
    navigate(
      { pathname: location.pathname, search: withoutTextParam(location.search) },
      { replace: true }
    );
  }, [location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!isSubmitting) return undefined;
    const timer = setTimeout(() => setIsSlowSave(true), SLOW_SAVE_MS);
    return () => {
      clearTimeout(timer);
      setIsSlowSave(false);
    };
  }, [isSubmitting]);

  useEffect(() => {
    // Load credit cards for fuzzy matching
    dashboardService
      .fetchCreditCards()
      .then((cards) => {
        setCreditCards(cards || []);
        writeCached(OFFLINE_CARDS_KEY, (cards || []).map((c) => ({ id: c.id, name: c.name })));
      })
      .catch((err) => console.error("Could not fetch cards:", err));

    // Load recent quick-add entries from localStorage (examples show only while there are none)
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) setRecentChips(cleanRecentChips(JSON.parse(stored)));
    } catch {
      // Ignore localStorage errors
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Your rules set the category, and the card when the text names none
  const { data: rules = [] } = useQuery({
    queryKey: ["rules"],
    queryFn: () =>
      dashboardService.fetchRules().then((list) => {
        writeCached(OFFLINE_RULES_KEY, list || []);
        return list;
      }),
    placeholderData: () => readCached(OFFLINE_RULES_KEY),
    staleTime: 60000,
  });

  // Toronto's day, like the rest of the app, whatever time zone the phone is in
  const todayStr = getTorontoTodayStr();
  const typed = parseQuickAdd(input, creditCards, todayStr);
  const ruledParsed = applyRulesToQuickAdd(typed, rules, creditCards, todayStr);
  // A receipt's category fills in only when your rules and the keywords found none (typed > rules > keywords > AI)
  const receiptActive = receipt && input === receipt.text;
  const receiptCat = receiptActive ? receiptCategory(receipt.draft) : null;
  const parsed =
    receiptCat && ruledParsed.type !== "income" && ruledParsed.category === "Other"
      ? { ...ruledParsed, category: receiptCat }
      : ruledParsed;
  const exampleChips = useMemo(() => buildExampleChips(getTorontoTodayStr()), []);
  const showExamples = recentChips.length === 0;
  const isLinkList = linkItems.length > 1;

  // Marks the current link entry saved or skipped and moves to the next one
  const advanceLink = (status) => {
    const items = linkItems.map((it, i) => (i === linkIndex ? { ...it, status } : it));
    const next = items.findIndex((it, i) => i > linkIndex && it.status === "pending");
    pendingRef.current = null;
    if (next === -1) {
      if (items.length > 1) {
        const saved = items.filter((it) => it.status === "saved").length;
        if (saved > 0) toast.success(`Done: ${saved} of ${items.length} saved`);
        else toast("Nothing saved from this link");
      }
      setLinkItems([]);
      setLinkIndex(0);
      setInput("");
    } else {
      setLinkItems(items);
      setLinkIndex(next);
      setInput(items[next].text);
    }
    if (inputRef.current) inputRef.current.focus();
  };

  const stopLink = () => {
    pendingRef.current = null;
    setLinkItems([]);
    setLinkIndex(0);
    setInput("");
  };

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
    // Keyed on the text as typed, so rules arriving between a timed-out save and its retry keep the clientRef
    const { pending, clientRef } = getClientRef(pendingRef.current, typed, () =>
      crypto.randomUUID()
    );
    pendingRef.current = pending;

    const kind = parsed.type === "income" ? "income" : "expense";
    const payload =
      kind === "income"
        ? {
            name: parsed.name,
            amount: parsed.amount,
            payment_date: parsed.date,
            recurrence: "none",
            clientRef,
          }
        : {
            name: parsed.name,
            amount: parsed.amount,
            due_date: parsed.date,
            category: parsed.category,
            creditCardId: parsed.creditCardId,
            is_paid: parsed.is_paid,
            applyToBalance: parsed.applyToBalance,
            recurrence: "none",
            clientRef,
          };

    const finishEntry = () => {
      pendingRef.current = null;
      setReceipt(null);
      saveRecentChip(entry);
      if (linkItems.length > 0) {
        advanceLink("saved");
      } else {
        setInput("");
        if (inputRef.current) inputRef.current.focus();
      }
    };

    // No connection: keep the save (with its clientRef and date) and send it when back online (F10)
    const queueIt = async () => {
      const waiting = await queueQuickAddSave({ kind, payload, label: entry });
      toast(`Saved offline: ${parsed.name} (${formatCurrency(parsed.amount)}). ${queueBadgeText(waiting)}.`, {
        icon: "📥",
      });
      finishEntry();
    };

    try {
      if (isOffline()) {
        await queueIt();
        return;
      }
      if (kind === "income") {
        await dashboardService.addPaycheque(payload);
      } else {
        await dashboardService.addExpense(payload);
      }

      toast.success(
        kind === "income"
          ? `Recorded income: ${formatCurrency(parsed.amount)}`
          : `Saved: ${parsed.name} (${formatCurrency(parsed.amount)})`
      );
      finishEntry();
    } catch (err) {
      if (shouldQueueSave(err, !isOffline())) {
        try {
          await queueIt();
          return;
        } catch (queueErr) {
          console.error("Could not queue the save:", queueErr);
        }
      }
      console.error("Quick add failed:", err);
      toast.error(
        err?.response?.data?.error ||
          "Could not save transaction. Press Save again to retry; it won't be saved twice."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // A receipt photo fills the input; nothing is saved until Save (AI5)
  const handleReceiptDraft = (draft) => {
    const text = receiptDraftToQuickAddText(draft, todayStr);
    pendingRef.current = null;
    setInput(text);
    setReceipt({ draft, text });
    const gaps = receiptDraftGaps(draft);
    if (gaps.length > 0) toast(`Check the ${gaps.join(" and ")}: the receipt didn't show ${gaps.length === 1 ? "it" : "them"} clearly.`);
    if (inputRef.current) inputRef.current.focus();
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

      {queuedCount > 0 && (
        <p className="-mt-3 mb-4 inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-200">
          <CloudOff size={12} aria-hidden="true" />
          {queueBadgeText(queuedCount)}
        </p>
      )}

      {/* Entries from a Quick Add link: never saved until Save is tapped */}
      {linkItems.length > 0 && (
        <div className="glass-panel p-4 mb-4 border border-sky-500/25 bg-sky-950/10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              <Sparkles size={15} className="text-sky-400 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">
                  {isLinkList
                    ? `From a link: entry ${linkIndex + 1} of ${linkItems.length}`
                    : "Filled from a link"}
                </p>
                <p className="text-xs text-zinc-400">
                  Check it, then tap Save. Nothing is saved until you do.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={stopLink}
              disabled={isSubmitting}
              aria-label="Dismiss link entries"
              className="shrink-0 min-h-[40px] min-w-[40px] -mr-2 -mt-2 flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-200 disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>

          {isLinkList && (
            <>
              <ol className="mt-3 space-y-1">
                {linkItems.map((it, i) => (
                  <li
                    key={i}
                    className={`flex items-center gap-2 text-xs rounded-md px-2 py-1 min-w-0 ${
                      i === linkIndex ? "bg-white/[0.06] text-zinc-100" : "text-zinc-500"
                    }`}
                  >
                    <span className="w-14 shrink-0 tabular-nums">
                      {it.status === "saved" ? "✓ Saved" : it.status === "skipped" ? "Skipped" : i === linkIndex ? "Now" : `${i + 1}.`}
                    </span>
                    <span className={`truncate font-mono ${it.status === "skipped" ? "line-through" : ""}`}>
                      {it.text}
                    </span>
                  </li>
                ))}
              </ol>
              <button
                type="button"
                onClick={() => advanceLink("skipped")}
                disabled={isSubmitting}
                className="mt-3 min-h-[40px] px-3 rounded-lg border border-white/[0.08] bg-zinc-900 text-xs font-medium text-zinc-300 hover:text-zinc-100 hover:border-white/20 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                <SkipForward size={13} />
                Skip this one
              </button>
            </>
          )}
        </div>
      )}

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
              placeholder={`e.g. ${exampleChips[0]}, ${exampleChips[1]}`}
              className="w-full bg-transparent text-base sm:text-lg text-zinc-100 placeholder-zinc-600 focus:outline-none"
              autoComplete="off"
              autoFocus
            />
            {input && (
              <button
                type="button"
                onClick={() => setInput("")}
                className="shrink-0 min-h-10 text-xs text-zinc-500 hover:text-zinc-300 px-1.5 rounded"
              >
                Clear
              </button>
            )}
            <ReceiptScanButton
              onDraft={handleReceiptDraft}
              disabled={isSubmitting}
              label="Receipt"
              className="shrink-0 px-2.5"
            />
          </div>
          {receiptActive && (
            <p className="mt-2 text-[11px] text-sky-300/90 break-words">
              {receiptDraftSummary(receipt.draft)}. Check it, then Save.
            </p>
          )}
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
                <Tag size={11} className={parsed.ruleApplied ? "text-violet-300" : "text-zinc-500"} />
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
              <li>Type <code className="text-zinc-300 font-mono">{exampleChips[1]}</code> (or a date like 11/05) for an upcoming unpaid bill.</li>
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
            <span>{isSlowSave ? "Waking up the server..." : "Saving..."}</span>
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

      {/* Recent Chips (hidden during a link list, so a chip can't be saved as a link entry) */}
      {linkItems.length === 0 && (
        <div className="mt-8 pt-6 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-medium mb-3">
            {showExamples ? <Lightbulb size={13} /> : <History size={13} />}
            <span>{showExamples ? "Examples (tap to try)" : "Recent Quick Entries (Tap to repeat)"}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(showExamples ? exampleChips : recentChips).map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleChipClick(chip)}
                className="min-h-10 px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/[0.06] text-xs text-zinc-300 hover:text-zinc-100 hover:border-white/20 transition-all cursor-pointer truncate max-w-full"
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
