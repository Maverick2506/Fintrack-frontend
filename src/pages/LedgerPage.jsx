import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Search,
  Trash2,
  Plus,
  ReceiptText,
  Check,
  CheckCheck,
  X,
  ChevronDown,
  ChevronRight,
  SlidersHorizontal,
  CreditCard,
  Landmark,
  HandCoins,
  PiggyBank,
  Wallet,
  CircleStop,
  Upload,
  Inbox,
  StickyNote,
} from "lucide-react";
import dashboardService from "../services/dashboardService";
import AddTransactionModal from "../components/Modals/AddTransactionModal";
import CompactSummaryBar from "../components/Common/CompactSummaryBar";
import ConfirmDeleteModal from "../components/Modals/ConfirmDeleteModal";
import { formatCurrency, formatShortDate } from "../utils/formatUtils";
import { TRASH_DELETE_DESCRIPTION } from "../utils/undoDelete";
import { canEndSeries } from "../utils/endSeries";
import { confirmAndEndSeries } from "../services/endSeriesAction";
import SwipeableRow from "../components/Ledger/SwipeableRow";
import CategoryIcon from "../components/Ledger/CategoryIcon";
import LedgerFilterSheet from "../components/Ledger/LedgerFilterSheet";
import RowActionsMenu from "../components/Ledger/RowActionsMenu";
import { TRANSACTIONS_RESTORED_EVENT } from "../components/Common/UndoDeleteToast";
import useMediaQuery from "../hooks/useMediaQuery";
import useEscapeClose from "../hooks/useEscapeClose";
import { getLedgerAccountLine, ledgerRowMatchesSearch } from "../utils/accountRetire";
import { collectTags, matchesTag, tagsOf } from "../utils/transactionTags";
import { getTorontoTodayStr } from "../utils/dateUtils";
import usePayFromFund from "../hooks/usePayFromFund";
import { billPaidToast, bulkPayOptions } from "../utils/planningAlerts";
import {
  groupLedgerRows,
  summarizeLedgerGroup,
  formatDayLabel,
  getLedgerRowTag,
} from "../utils/ledgerGroups";
import {
  TYPE_OPTIONS,
  SORT_OPTIONS,
  DEFAULT_SORT,
  monthOptionLabel,
  getActiveFilterChips,
} from "../utils/ledgerFilters";

// Glyph in front of an account name on the row's second line
const ACCOUNT_GLYPHS = {
  CHECKING: Landmark,
  CREDIT_CARD: CreditCard,
  DEBT: HandCoins,
  SAVINGS_GOAL: PiggyBank,
};

// Sticky offsets: the app header is h-14; the Upcoming header below it is h-11
const UPCOMING_HEADER_TOP = "top-14";
const UPCOMING_DAY_TOP = "top-[100px]";
// Pointer screens: rows end with three 40 px action buttons (gap 12 px, row padding 16 px), so
// headers pad their totals by the same 148 px to line up with the row amounts
const POINTER_TOTALS_PAD = "pr-[148px]";

// An account name of up to 16 characters ("Amex Cobalt") counts as short
const SHORT_ACCOUNT_NAME = 16;
const accountClass = (from, to, which) => {
  if (!to) return "min-w-0";
  const fromShort = from.name.length <= SHORT_ACCOUNT_NAME;
  if (which === "from") return fromShort ? "shrink-0" : "min-w-0 max-w-[50%]";
  return fromShort ? "min-w-0" : "min-w-0 max-w-[50%]";
};

const AccountName = ({ side, className = "min-w-0" }) => {
  const Glyph = ACCOUNT_GLYPHS[side.type] || Wallet;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={side.name}>
      <Glyph size={11} className="shrink-0 text-zinc-500" aria-hidden="true" />
      <span className="truncate">{side.name}</span>
    </span>
  );
};

const LedgerPage = () => {
  const [rows, setRows] = useState([]);
  // Rows a bank import added that are still waiting in Review new
  const reviewCount = useMemo(() => rows.filter((r) => r.needsReview).length, [rows]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState(DEFAULT_SORT.key);
  const [sortDir, setSortDir] = useState(DEFAULT_SORT.dir);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);

  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Selection mode: started by "Select" or a long press; checkboxes and the action bar show only then
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastClickedIndex, setLastClickedIndex] = useState(null);
  const { askPayFrom, defaultPayFrom, dialog: payFromFundDialog } = usePayFromFund();
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isBulkMarking, setIsBulkMarking] = useState(false);

  // Upcoming starts closed; swipe actions show on phones and touch screens
  const [isUpcomingOpen, setIsUpcomingOpen] = useState(false);
  const [swipeOpen, setSwipeOpen] = useState(null); // { id, action }
  const isTouchList = useMediaQuery("(max-width: 639px), (pointer: coarse)");
  // From 1024 px the filters sit inline; below that they live in the Filter sheet
  const isWide = useMediaQuery("(min-width: 1024px)");

  const loadLedger = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardService.fetchLedger();
      setRows(data);
      setSelectedIds(new Set());
      setLastClickedIndex(null);
    } catch (err) {
      console.error("Failed to fetch ledger:", err);
      setError(
        err?.response?.data?.error ||
          err?.message ||
          "Failed to load transaction ledger"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLedger();
  }, [loadLedger]);

  // Re-reads the ledger without the loading screen, e.g. after marking a row paid
  const refreshRowsQuietly = useCallback(() => {
    dashboardService
      .fetchLedger()
      .then(setRows)
      .catch((err) => console.error("Failed to refresh ledger:", err));
  }, []);

  // Undo (toast) or Trash restores rows: show them again
  useEffect(() => {
    window.addEventListener(TRANSACTIONS_RESTORED_EVENT, refreshRowsQuietly);
    return () => window.removeEventListener(TRANSACTIONS_RESTORED_EVENT, refreshRowsQuietly);
  }, [refreshRowsQuietly]);

  const exitSelection = useCallback(() => {
    setIsSelecting(false);
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, []);

  // Esc ends selection mode, unless a dialog or the sheet is open and takes the Esc itself
  useEscapeClose(
    isSelecting && !isBulkDeleteModalOpen && !isFilterSheetOpen && !isTxModalOpen && !deleteTarget,
    exitSelection
  );

  const handleMarkPaid = async (row) => {
    setSwipeOpen(null);
    // A bill a savings goal saves for asks "Pay from <fund>" first; cancelling leaves it unpaid
    const choice = await askPayFrom(row);
    if (!choice) return;
    try {
      await dashboardService.markBillAsPaid(
        row.id,
        row.type === "income" ? "Marked as received!" : billPaidToast,
        choice
      );
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, is_paid: true } : r)));
      refreshRowsQuietly();
    } catch (err) {
      // handleRequest already showed the error toast
      console.error("Failed to mark transaction as paid:", err);
    }
  };

  useEffect(() => {
    setSelectedIds(new Set());
    setLastClickedIndex(null);
  }, [search, typeFilter, categoryFilter, monthFilter, tagFilter]);

  const setSort = (key, dir) => {
    setSortKey(key);
    setSortDir(dir);
  };

  const resetFilters = () => {
    setTypeFilter("all");
    setCategoryFilter("all");
    setMonthFilter("all");
    setTagFilter("all");
    setSort(DEFAULT_SORT.key, DEFAULT_SORT.dir);
  };

  const removeChip = (id) => {
    if (id === "type") setTypeFilter("all");
    if (id === "category") setCategoryFilter("all");
    if (id === "month") setMonthFilter("all");
    if (id === "tag") setTagFilter("all");
    if (id === "sort") setSort(DEFAULT_SORT.key, DEFAULT_SORT.dir);
  };

  // Deletes one row; the toast offers Undo, so the swipe Delete skips the confirm step
  const deleteRow = async (row) => {
    await dashboardService.deleteBill(row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(row.id);
      return next;
    });
  };

  const handleSwipeDelete = async (row) => {
    setSwipeOpen(null);
    try {
      await deleteRow(row);
    } catch (err) {
      // handleRequest already showed the error toast (e.g. 409 for an archived account)
      console.error("Failed to delete transaction:", err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteRow(deleteTarget);
      setDeleteTarget(null);
    } catch (err) {
      // handleRequest already showed the error toast
      console.error("Failed to delete transaction:", err);
    }
  };

  const handleConfirmBulkDelete = async () => {
    const ids = visibleRows.filter((r) => selectedIds.has(r.id)).map((r) => r.id);
    if (ids.length === 0) return;
    try {
      await dashboardService.bulkDeleteTransactions(ids);
      const idSet = new Set(ids);
      setRows((prev) => prev.filter((r) => !idSet.has(r.id)));
      setIsBulkDeleteModalOpen(false);
      exitSelection();
    } catch (err) {
      // handleRequest already showed the error toast
      console.error("Failed to bulk delete:", err);
    }
  };

  // Marks the selected unpaid rows paid (income: received), one request each, then one toast
  const handleBulkMarkPaid = async () => {
    const targets = visibleRows.filter((r) => selectedIds.has(r.id) && !r.is_paid);
    if (targets.length === 0 || isBulkMarking) return;
    setIsBulkMarking(true);
    const done = [];
    let fromFunds = 0;
    let fromFundsTotal = 0;
    const cardsPaid = new Set();
    for (const row of targets) {
      try {
        // A bill a savings goal saves for is paid from it, the same default as the single "Paid" dialog.
        // A card's fund bills go with its first payment in the batch that goes through.
        const { options, cardId } = bulkPayOptions(defaultPayFrom(row), row, cardsPaid);
        const result = await dashboardService.markBillAsPaid(row.id, null, options);
        if (cardId) cardsPaid.add(cardId);
        const paid = [
          ...(result?.sinkingFund?.paidFromFund?.amount > 0 ? [result.sinkingFund.paidFromFund] : []),
          ...(result?.cardFunds || []).filter((f) => f.amount > 0),
        ];
        fromFunds += paid.length;
        fromFundsTotal += paid.reduce((sum, f) => sum + f.amount, 0);
        done.push(row);
      } catch (err) {
        // handleRequest already showed the error toast for this row
        console.error("Failed to mark transaction as paid:", err);
      }
    }
    setIsBulkMarking(false);
    if (done.length > 0) {
      const doneIds = new Set(done.map((r) => r.id));
      setRows((prev) => prev.map((r) => (doneIds.has(r.id) ? { ...r, is_paid: true } : r)));
      const word = done.every((r) => r.type === "income") ? "received" : "paid";
      const fundNote =
        fromFunds > 0
          ? ` (${formatCurrency(fromFundsTotal)} from ${fromFunds === 1 ? "a savings goal" : `${fromFunds} savings goals`})`
          : "";
      toast.success(`Marked ${done.length} transaction${done.length === 1 ? "" : "s"} as ${word}${fundNote}`);
      refreshRowsQuietly();
      exitSelection();
    }
  };

  const availableCategories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const availableTags = useMemo(() => collectTags(rows), [rows]);

  const availableMonths = useMemo(() => {
    const set = new Set(
      rows
        .map((r) => (r.date ? String(r.date).slice(0, 7) : null))
        .filter(Boolean)
    );
    return Array.from(set).sort().reverse();
  }, [rows]);

  const filtered = useMemo(() => {
    let data = rows;
    if (typeFilter !== "all") data = data.filter((r) => r.type === typeFilter);
    if (categoryFilter !== "all")
      data = data.filter((r) => r.category === categoryFilter);
    if (monthFilter !== "all")
      data = data.filter((r) => String(r.date).startsWith(monthFilter));
    if (tagFilter !== "all") data = data.filter((r) => matchesTag(r, tagFilter));
    // Account names count too (card, debt, goal and Checking, even when the row shows "To Amex")
    if (search) data = data.filter((r) => ledgerRowMatchesSearch(r, search));
    return [...data].sort((a, b) => {
      let va = a[sortKey],
        vb = b[sortKey];
      if (sortKey === "date") {
        va = new Date(va);
        vb = new Date(vb);
      }
      if (sortKey === "amount") {
        va = parseFloat(va);
        vb = parseFloat(vb);
      }
      if (sortKey === "name") {
        va = String(va || "").toLowerCase();
        vb = String(vb || "").toLowerCase();
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, search, sortKey, sortDir, typeFilter, categoryFilter, monthFilter, tagFilter]);

  const todayStr = getTorontoTodayStr();
  const groups = useMemo(
    () =>
      groupLedgerRows(filtered, todayStr, {
        dateDir: sortKey === "date" ? sortDir : "desc",
        sortByDate: sortKey === "date",
      }),
    [filtered, todayStr, sortKey, sortDir]
  );

  // Rows on screen, in screen order: select all, Shift ranges and bulk actions only touch these
  const visibleRows = useMemo(
    () =>
      groups.flatMap((g) =>
        g.key === "upcoming" && !isUpcomingOpen ? [] : g.days.flatMap((d) => d.rows)
      ),
    [groups, isUpcomingOpen]
  );
  const visibleIndex = useMemo(
    () => new Map(visibleRows.map((r, idx) => [r, idx])),
    [visibleRows]
  );

  const toggleUpcoming = () => {
    if (isUpcomingOpen) {
      // Rows that get hidden drop out of the selection
      const upcomingIds = new Set(
        (groups.find((g) => g.key === "upcoming")?.rows || []).map((r) => r.id)
      );
      setSelectedIds((prev) => new Set([...prev].filter((id) => !upcomingIds.has(id))));
      setLastClickedIndex(null);
    }
    setIsUpcomingOpen((open) => !open);
  };

  // One selected row of a recurring series (income and transfers too) can end its series
  const selectedSeriesRow =
    selectedIds.size === 1
      ? visibleRows.find((r) => selectedIds.has(r.id) && canEndSeries(r)) || null
      : null;

  // End series through the shared dialog (dry-run numbers, then confirm), from the bar or a ⋯ menu
  const handleEndSeries = async (row) => {
    const result = await confirmAndEndSeries(row);
    if (result) {
      exitSelection();
      loadLedger();
    }
  };

  const allVisibleSelected =
    visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
  const selectedRows = visibleRows.filter((r) => selectedIds.has(r.id));
  const selectedUnpaidCount = selectedRows.filter((r) => !r.is_paid).length;

  const handleToggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      visibleRows.forEach((r) => (allVisibleSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  };

  const handleToggleRow = (id, index, shiftKey) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const willSelect = !next.has(id);

      if (shiftKey && lastClickedIndex !== null && lastClickedIndex !== index) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        for (let idx = start; idx <= end; idx++) {
          const rowItem = visibleRows[idx];
          if (rowItem) {
            if (willSelect) next.add(rowItem.id);
            else next.delete(rowItem.id);
          }
        }
      } else {
        if (willSelect) next.add(id);
        else next.delete(id);
      }
      return next;
    });
    setLastClickedIndex(index);
  };

  const startSelection = (row) => {
    setSwipeOpen(null);
    setIsSelecting(true);
    if (row) {
      setSelectedIds(new Set([row.id]));
      setLastClickedIndex(visibleIndex.get(row) ?? null);
    }
  };

  const openEdit = (row) => {
    setEditingTx(row);
    setIsTxModalOpen(true);
  };

  // A tap opens the row for editing, or toggles it while selecting
  const handleRowActivate = (row, shiftKey = false) => {
    if (isSelecting) handleToggleRow(row.id, visibleIndex.get(row), shiftKey);
    else openEdit(row);
  };

  const totalIncome = filtered
    .filter((r) => r.type === "income")
    .reduce((s, r) => s + r.amount, 0);
  const totalExpense = filtered
    .filter((r) => r.type === "expense")
    .reduce((s, r) => s + r.amount, 0);

  const clearedIncome = filtered
    .filter((r) => r.type === "income" && r.is_paid)
    .reduce((s, r) => s + r.amount, 0);
  const pendingIncome = filtered
    .filter((r) => r.type === "income" && !r.is_paid)
    .reduce((s, r) => s + r.amount, 0);

  const clearedExpense = filtered
    .filter((r) => r.type === "expense" && r.is_paid)
    .reduce((s, r) => s + r.amount, 0);
  const pendingExpense = filtered
    .filter((r) => r.type === "expense" && !r.is_paid)
    .reduce((s, r) => s + r.amount, 0);

  const clearedNet = clearedIncome - clearedExpense;

  const renderAmount = (row) => {
    if (row.type === "income") {
      return <span className="text-emerald-400">+{formatCurrency(row.amount)}</span>;
    }
    if (row.type === "transfer") {
      return (
        <span className="text-zinc-400">
          <span aria-hidden="true">⇄ </span>
          {formatCurrency(row.amount)}
        </span>
      );
    }
    if (row.amount < 0) {
      // A refund: negative spending
      return (
        <span className="text-emerald-400" title="Refund">
          +{formatCurrency(Math.abs(row.amount))}
        </span>
      );
    }
    return <span className="text-zinc-100">{formatCurrency(-Math.abs(row.amount))}</span>;
  };

  const renderDayNet = (net) => {
    if (net === 0) return null;
    return (
      <span className={`tabular-nums ${net > 0 ? "text-emerald-400/90" : "text-zinc-400"}`}>
        {net > 0 ? "+" : ""}
        {formatCurrency(net)}
      </span>
    );
  };

  // Icon, "Name [Overdue]" over "Category · Account", then the amount; ~56 px tall
  // showDate: Name and Amount sorts have no day headers, so the row carries its date
  const renderRowContent = (row, isUpcoming, showDate) => {
    const isSelected = selectedIds.has(row.id);
    const tag = getLedgerRowTag(row, todayStr);
    const { from, to, direction } = getLedgerAccountLine(row);
    const rowTags = tagsOf(row);
    const dim = isUpcoming && !isSelected ? "opacity-75" : "";
    return (
      <div
        className={`flex items-center gap-3 pl-4 pr-4 py-2 min-h-14 ${
          isSelected ? "bg-white/[0.06]" : ""
        }`}
      >
        <CategoryIcon
          category={row.category}
          type={row.type}
          selecting={isSelecting}
          selected={isSelected}
        />
        <div className={`flex-1 min-w-0 ${dim}`}>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-sm font-medium text-zinc-100 truncate" title={row.name}>
              {row.name}
            </span>
            {tag && (
              <span
                className={`text-[10px] font-semibold leading-4 px-1.5 rounded shrink-0 whitespace-nowrap ${
                  tag.tone === "overdue"
                    ? "bg-rose-500/15 text-rose-300"
                    : "bg-amber-500/10 text-amber-300"
                }`}
              >
                {tag.label}
              </span>
            )}
          </div>
          {/* "Category · Account"; a transfer reads "To Amex" / "From Trip" (or "Amex → Visa" between
              two non-Checking accounts), its ⇄ icon already says payment */}
          <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500 min-w-0">
            {row.type !== "transfer" && (
              // The category keeps up to half the line and the account truncates first, so the
              // category never collapses to a lone "·"
              <span className="truncate shrink-0 max-w-[50%]" title={row.category}>
                {row.category}
              </span>
            )}
            {from && (
              <>
                {row.type !== "transfer" && (
                  <span aria-hidden="true" className="shrink-0">·</span>
                )}
                {direction && (
                  <span className="shrink-0">{direction === "to" ? "To" : "From"}</span>
                )}
                {/* With "from → to": a short from side (a card) stays whole and the to side
                    truncates; when both are long, each gets at most half the line */}
                <AccountName side={from} className={accountClass(from, to, "from")} />
                {to && (
                  <>
                    <span aria-hidden="true" className="shrink-0">→</span>
                    <AccountName side={to} className={accountClass(from, to, "to")} />
                  </>
                )}
              </>
            )}
            {showDate && (
              <>
                <span aria-hidden="true" className="shrink-0">·</span>
                <span className="shrink-0 tabular-nums whitespace-nowrap">
                  {formatShortDate(row.date)}
                  {String(row.date).slice(0, 4) !== todayStr.slice(0, 4) && `, ${String(row.date).slice(0, 4)}`}
                </span>
              </>
            )}
          </div>
          {(rowTags.length > 0 || row.notes) && (
            <div className="flex items-center gap-1 mt-0.5 text-[11px] min-w-0">
              {row.notes && (
                <StickyNote size={11} className="shrink-0 text-zinc-500" aria-hidden="true" />
              )}
              {rowTags.length > 0 && (
                <span className="truncate text-sky-300/80" title={rowTags.map((t) => `#${t}`).join(" ")}>
                  {rowTags.map((t) => `#${t}`).join(" ")}
                </span>
              )}
            </div>
          )}
        </div>
        <div className={`text-sm font-medium tabular-nums text-right whitespace-nowrap shrink-0 ${dim}`}>
          {renderAmount(row)}
        </div>
        {/* Pointer screens: Mark paid and Delete on hover or keyboard focus, and an always-visible
            ⋯ menu (touch screens swipe instead). Kept in place while selecting, so amounts don't move. */}
        {!isTouchList && (
          <div className={`flex items-center ${isSelecting ? "invisible" : ""}`}>
            <div className="flex items-center opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMarkPaid(row);
                }}
                disabled={row.is_paid}
                title={row.type === "income" ? "Mark received" : "Mark paid"}
                aria-label={`${row.type === "income" ? "Mark received" : "Mark paid"}: ${row.name}`}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-emerald-400 hover:bg-white/[0.06] cursor-pointer disabled:invisible"
              >
                <Check size={15} />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(row);
                }}
                title="Delete transaction"
                aria-label={`Delete ${row.name}`}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-white/[0.06] cursor-pointer"
              >
                <Trash2 size={15} />
              </button>
            </div>
            <RowActionsMenu
              rowName={row.name}
              isIncome={row.type === "income"}
              canMarkPaid={!row.is_paid}
              onMarkPaid={() => handleMarkPaid(row)}
              onDelete={() => setDeleteTarget(row)}
              onEndSeries={canEndSeries(row) ? () => handleEndSeries(row) : undefined}
            />
          </div>
        )}
      </div>
    );
  };

  const renderRow = (row, isUpcoming, showDate) => {
    if (isTouchList) {
      return (
        <SwipeableRow
          openAction={swipeOpen?.id === row.id ? swipeOpen.action : null}
          onOpenChange={(action) => setSwipeOpen(action ? { id: row.id, action } : null)}
          swipeEnabled={!isSelecting}
          canMarkPaid={!row.is_paid}
          markPaidLabel={row.type === "income" ? "Received" : "Mark paid"}
          onMarkPaid={() => handleMarkPaid(row)}
          onDelete={() => handleSwipeDelete(row)}
          onTap={() => handleRowActivate(row)}
          onLongPress={isSelecting ? undefined : () => startSelection(row)}
        >
          {renderRowContent(row, isUpcoming, showDate)}
        </SwipeableRow>
      );
    }
    return (
      <div
        role="button"
        tabIndex={0}
        aria-pressed={isSelecting ? selectedIds.has(row.id) : undefined}
        aria-label={isSelecting ? `Select ${row.name}` : `Edit ${row.name}`}
        onClick={(e) => handleRowActivate(row, e.shiftKey)}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleRowActivate(row, e.shiftKey);
          }
        }}
        className="group cursor-pointer select-none hover:bg-white/[0.025] focus-visible:outline-none focus-visible:bg-white/[0.04]"
      >
        {renderRowContent(row, isUpcoming, showDate)}
      </div>
    );
  };

  const renderUpcomingHeader = (group) => {
    const { count, moneyIn, moneyOut } = summarizeLedgerGroup(group.rows);
    const Chevron = isUpcomingOpen ? ChevronDown : ChevronRight;
    return (
      <button
        type="button"
        onClick={toggleUpcoming}
        aria-expanded={isUpcomingOpen}
        className={`sticky ${UPCOMING_HEADER_TOP} z-20 w-full h-11 px-4 ${isTouchList ? "" : POINTER_TOTALS_PAD} flex items-center justify-between gap-3 text-left bg-[#16140f] hover:bg-[#1b1812] border-b border-white/[0.05] cursor-pointer`}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Chevron size={14} className="text-zinc-400 shrink-0" />
          <span className="text-[11px] font-semibold text-amber-300 uppercase tracking-wider">
            {group.label}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 tabular-nums">
            {count}
          </span>
        </span>
        <span className="flex items-center gap-2 text-xs font-medium tabular-nums whitespace-nowrap">
          {moneyIn > 0 && <span className="text-emerald-400/80">+{formatCurrency(moneyIn)}</span>}
          {moneyOut > 0 && <span className="text-zinc-300">-{formatCurrency(moneyOut)}</span>}
        </span>
      </button>
    );
  };

  const renderGroup = (group) => {
    const isUpcoming = group.key === "upcoming";
    const isHidden = isUpcoming && !isUpcomingOpen;
    // Today and Yesterday hold one day, whose header already says so
    const showSectionLabel =
      !isUpcoming && (sortKey !== "date" || (group.key !== "today" && group.key !== "yesterday"));
    return (
      <section key={group.key}>
        {isUpcoming && renderUpcomingHeader(group)}
        {showSectionLabel && (
          <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {group.label}
          </div>
        )}
        {!isHidden &&
          group.days.map((day) => (
            // date null: a Name or Amount sort, one block without a day header
            <div key={day.date ?? "sorted"}>
              {day.date !== null && (
                <div
                  className={`sticky ${isUpcoming ? UPCOMING_DAY_TOP : "top-14"} z-10 h-8 px-4 ${isTouchList ? "" : POINTER_TOTALS_PAD} flex items-center justify-between gap-3 text-xs font-medium bg-[#141416] border-y border-white/[0.04]`}
                >
                  <span className="text-zinc-300 truncate">{formatDayLabel(day.date, todayStr)}</span>
                  {renderDayNet(day.net)}
                </div>
              )}
              <ul className="divide-y divide-white/[0.04]">
                {day.rows.map((row) => (
                  <li key={`${row.type}-${row.id}`}>{renderRow(row, isUpcoming, day.date === null)}</li>
                ))}
              </ul>
            </div>
          ))}
      </section>
    );
  };

  const chips = getActiveFilterChips({ typeFilter, categoryFilter, monthFilter, tagFilter, sortKey, sortDir });
  const activeFilterCount = chips.filter((c) => c.id !== "sort").length;
  const currentSortValue = `${sortKey}:${sortDir}`;
  const inlineSelect =
    "h-10 bg-zinc-900/80 text-zinc-300 text-xs font-medium rounded-xl px-3 border border-white/[0.07] focus:outline-none focus:border-zinc-500";

  if (loading) {
    return (
      <div className="text-center text-zinc-500 text-sm p-12">
        Loading ledger...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[880px] mx-auto px-4 sm:px-6 pt-12 pb-20 text-center">
        <div className="glass-panel p-8 max-w-md mx-auto">
          <p className="text-rose-400 text-sm mb-4">{error}</p>
          <button
            onClick={loadLedger}
            className="btn-primary justify-center mx-auto cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-[880px] mx-auto px-4 sm:px-6 ${isSelecting ? "pb-40" : "pb-20"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 mb-8">
        <div>
          <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
            Activity
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight mt-0.5">
            Transaction Ledger
          </h1>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {reviewCount > 0 && (
            <Link
              to="/review"
              className="btn-secondary h-10 px-3 shrink-0 text-sky-300"
              title="Imported rows waiting for review"
              aria-label={`Review ${reviewCount} new`}
            >
              <Inbox size={14} />
              <span className="tabular-nums">{reviewCount}</span>
              <span className="hidden sm:inline">to review</span>
            </Link>
          )}
          <Link
            to="/import"
            className="btn-secondary h-10 px-3.5 shrink-0 hidden sm:inline-flex"
            title="Import transactions from a bank or card CSV"
          >
            <Upload size={14} />
            <span>Import</span>
          </Link>
          <Link
            to="/trash"
            className="btn-secondary h-10 px-3.5 shrink-0"
            title="Deleted transactions, kept for 30 days"
          >
            <Trash2 size={14} />
            <span>Trash</span>
          </Link>
          <button
            onClick={() => {
              setEditingTx(null);
              setIsTxModalOpen(true);
            }}
            className="btn-primary h-10 flex-1 sm:flex-none justify-center"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Transaction</span>
          </button>
        </div>
      </div>

      {/* Summary Bar (M3) */}
      <CompactSummaryBar
        items={[
          {
            label: "Total Income",
            shortLabel: "Income",
            value: `+${formatCurrency(clearedIncome)}`,
            colorClass: "text-emerald-400",
            subtitle: `Cleared (${filtered.filter((r) => r.type === "income" && r.is_paid).length} received)`,
            headerBadge: pendingIncome > 0 ? (
              <span className="text-[10px] text-zinc-500 font-medium" title="Unreceived future paycheques">
                +{formatCurrency(pendingIncome)} upcoming
              </span>
            ) : null,
          },
          {
            label: "Total Expenses",
            shortLabel: "Expenses",
            value: `-${formatCurrency(clearedExpense)}`,
            colorClass: "text-rose-400",
            subtitle: `Cleared (${filtered.filter((r) => r.type === "expense" && r.is_paid).length} paid)`,
            headerBadge: pendingExpense > 0 ? (
              <span className="text-[10px] text-zinc-500 font-medium" title="Unpaid upcoming bills">
                {formatCurrency(pendingExpense)} upcoming
              </span>
            ) : null,
          },
          {
            label: "Net Cleared",
            shortLabel: "Net",
            value: formatCurrency(clearedNet),
            colorClass: clearedNet >= 0 ? "text-zinc-100" : "text-rose-400",
            subtitle: (pendingIncome > 0 || pendingExpense > 0)
              ? `Proj: ${formatCurrency(totalIncome - totalExpense)}`
              : "Cleared income minus paid expenses",
            headerBadge: (pendingIncome > 0 || pendingExpense > 0) ? (
              <span className="text-[10px] text-zinc-500 font-medium" title="Projected net if all upcoming items clear">
                Proj: {formatCurrency(totalIncome - totalExpense)}
              </span>
            ) : null,
          },
        ]}
      />

      {/* One row: search, Filter (sheet) and Select. From 1024 px the search gets its own line and
          the inline filters sit under it, since the page is capped at 880 px */}
      <div className={`flex items-center gap-2 mb-3 ${isWide ? "flex-wrap" : ""}`}>
        <div className={`relative flex-1 min-w-0 ${isWide ? "basis-full" : ""}`}>
          <Search
            size={14}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search"
            aria-label="Search transactions"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 bg-zinc-900/60 text-zinc-100 text-sm sm:text-xs rounded-xl pl-9 pr-3 border border-white/[0.07] focus:outline-none focus:border-zinc-500 placeholder-zinc-500 transition-colors"
          />
        </div>

        {isWide ? (
          <>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              aria-label="Category"
              className={inlineSelect}
            >
              <option value="all">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              aria-label="Month"
              className={inlineSelect}
            >
              <option value="all">All Months</option>
              {availableMonths.map((ym) => (
                <option key={ym} value={ym}>
                  {monthOptionLabel(ym)}
                </option>
              ))}
            </select>
            {(availableTags.length > 0 || tagFilter !== "all") && (
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Tag"
                className={inlineSelect}
              >
                <option value="all">All Tags</option>
                {availableTags.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            )}
            <div className="inline-flex rounded-xl bg-zinc-900/80 border border-white/[0.06]">
              {TYPE_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                  className={`h-10 px-3 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    typeFilter === value
                      ? "bg-zinc-100 text-zinc-950"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <select
              value={currentSortValue}
              onChange={(e) => {
                const [key, dir] = e.target.value.split(":");
                setSort(key, dir);
              }}
              aria-label="Sort"
              className={inlineSelect}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={`${o.key}:${o.dir}`} value={`${o.key}:${o.dir}`}>
                  {o.label}
                </option>
              ))}
            </select>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setIsFilterSheetOpen(true)}
            className={`h-10 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
              chips.length > 0
                ? "bg-zinc-100/[0.08] text-zinc-100 border-white/[0.15]"
                : "bg-zinc-900/80 text-zinc-300 border-white/[0.07] hover:text-zinc-100"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="min-w-4 h-4 px-1 rounded-full bg-zinc-100 text-zinc-950 text-[10px] font-semibold flex items-center justify-center tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => (isSelecting ? exitSelection() : startSelection(null))}
          aria-pressed={isSelecting}
          className={`h-10 px-3 shrink-0 ${isWide ? "ml-auto" : ""} rounded-xl text-xs font-medium border transition-colors cursor-pointer ${
            isSelecting
              ? "bg-zinc-100 text-zinc-950 border-zinc-100"
              : "bg-zinc-900/80 text-zinc-300 border-white/[0.07] hover:text-zinc-100"
          }`}
        >
          {isSelecting ? "Done" : "Select"}
        </button>
      </div>

      {/* Filters in use, under the row; tap one to remove it */}
      {!isWide && chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-1.5 -mt-1 mb-2">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => removeChip(chip.id)}
              aria-label={`Remove filter: ${chip.label}`}
              className="h-10 inline-flex items-center cursor-pointer group"
            >
              <span className="h-7 pl-2.5 pr-1.5 inline-flex items-center gap-1 rounded-full bg-zinc-800/80 border border-white/[0.08] text-xs text-zinc-200 group-hover:border-white/[0.2]">
                {chip.label}
                <X size={12} className="text-zinc-400" />
              </span>
            </button>
          ))}
          {chips.length > 1 && (
            <button
              type="button"
              onClick={resetFilters}
              className="h-10 px-2 text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Rows grouped by section and day: swipeable on phones and touch screens */}
      <div className="glass-panel overflow-clip">
        {filtered.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-zinc-500 mb-2.5">
                <ReceiptText size={16} />
              </div>
              <p className="text-zinc-300 text-xs font-medium mb-1">
                {rows.length === 0
                  ? "No transactions recorded yet"
                  : "No matching transactions"}
              </p>
              <p className="text-zinc-500 text-[11px] max-w-xs mb-4">
                {rows.length === 0
                  ? "Log your first expense or paycheck to start building your ledger."
                  : "Try adjusting your search query or filters."}
              </p>
              {rows.length === 0 && (
                <button
                  onClick={() => {
                    setEditingTx(null);
                    setIsTxModalOpen(true);
                  }}
                  className="btn-primary"
                >
                  <Plus size={14} strokeWidth={2} />
                  <span>Add First Transaction</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>{groups.map(renderGroup)}</div>
        )}
        <div className="border-t border-white/[0.05] px-4 py-2.5 flex items-center justify-between gap-3">
          <p className="text-[11px] text-zinc-500 min-w-0">
            {isSelecting
              ? isTouchList
                ? "Tap rows to select them"
                : "Click rows to select them; Shift+Click selects a range"
              : isTouchList
              ? "Swipe a row for Delete or Mark paid; hold one to select"
              : "Click a row to edit it"}
          </p>
          <p className="text-[11px] text-zinc-500 tabular-nums shrink-0">
            {filtered.length} transactions
          </p>
        </div>
      </div>

      {/* Selection mode: actions for the selected rows, above the phone tab bar */}
      {isSelecting && (
        <div className="fixed inset-x-4 bottom-[76px] md:bottom-6 z-30 max-w-lg mx-auto">
          <div className="flex items-center gap-1.5 p-1.5 pl-1 rounded-2xl bg-zinc-900/95 backdrop-blur-md border border-white/[0.12] shadow-2xl">
            <button
              type="button"
              onClick={exitSelection}
              aria-label="Done selecting"
              title="Done (Esc)"
              className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer"
            >
              <X size={16} />
            </button>
            <span className="text-xs font-semibold text-zinc-100 tabular-nums whitespace-nowrap">
              {selectedRows.length} selected
            </span>
            <button
              type="button"
              onClick={handleToggleSelectAll}
              disabled={visibleRows.length === 0}
              aria-label={allVisibleSelected ? "Select none" : "Select all"}
              title={allVisibleSelected ? "Select none" : "Select all"}
              className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] cursor-pointer disabled:opacity-40"
            >
              <CheckCheck size={16} />
            </button>
            <span className="flex-1" />
            {selectedSeriesRow && (
              <button
                type="button"
                onClick={() => handleEndSeries(selectedSeriesRow)}
                aria-label="End series"
                title="End series"
                className="h-10 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-white/[0.1] hover:bg-white/[0.05] text-rose-300 text-xs font-medium cursor-pointer"
              >
                <CircleStop size={14} />
                {/* The stop icon alone is hard to read, so narrow phones keep a short "End" */}
                <span className="min-[420px]:hidden">End</span>
                <span className="hidden min-[420px]:inline">End series</span>
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkMarkPaid}
              aria-label="Mark selected paid"
              disabled={selectedUnpaidCount === 0 || isBulkMarking}
              className="h-10 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/25 text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Check size={14} />
              <span className={selectedSeriesRow ? "hidden min-[420px]:inline" : undefined}>Paid</span>
            </button>
            <button
              type="button"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              disabled={selectedRows.length === 0}
              aria-label="Delete selected"
              className="h-10 px-3 shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Trash2 size={14} />
              <span className={selectedSeriesRow ? "hidden min-[420px]:inline" : undefined}>Delete</span>
            </button>
          </div>
        </div>
      )}

      <LedgerFilterSheet
        isOpen={isFilterSheetOpen}
        onClose={() => setIsFilterSheetOpen(false)}
        categories={availableCategories}
        months={availableMonths}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        monthFilter={monthFilter}
        setMonthFilter={setMonthFilter}
        tags={availableTags}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        sortKey={sortKey}
        sortDir={sortDir}
        setSort={setSort}
        onReset={resetFilters}
        resultCount={filtered.length}
      />
      <AddTransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false);
          setEditingTx(null);
        }}
        refreshData={loadLedger}
        existingTransaction={editingTx}
        onDelete={(tx) => setDeleteTarget(tx)}
      />
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        itemType="transaction"
        description={TRASH_DELETE_DESCRIPTION}
        itemName={deleteTarget?.name}
      />
      <ConfirmDeleteModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        itemType="selected transactions"
        description={TRASH_DELETE_DESCRIPTION}
        itemName={`${selectedRows.length} transaction${
          selectedRows.length === 1 ? "" : "s"
        }`}
      />
      {payFromFundDialog}
    </div>
  );
};

export default LedgerPage;
