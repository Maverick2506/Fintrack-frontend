import React, { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatUtils";
import {
  Pencil,
  Trash2,
  CheckCircle2,
  Check,
  CreditCard,
  Landmark,
} from "lucide-react";

const UpcomingBills = ({
  bills,
  onMarkAsPaid,
  onEdit,
  onDelete,
  onBulkDelete,
}) => {
  const [paying, setPaying] = useState(new Set());
  const [selectedIds, setSelectedIds] = useState(new Set());
  // Ticking a checkbox starts multi-select; "Paid" marks one bill paid with one tap
  const isSelecting = selectedIds.size > 0;

  useEffect(() => {
    // Prune any selected IDs that are no longer in bills
    setSelectedIds((prev) => {
      const validIds = new Set(bills.map((b) => b.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [bills]);

  const handleCheck = async (billId) => {
    setPaying((prev) => new Set([...prev, billId]));
    try {
      await new Promise((r) => setTimeout(r, 300));
      if (onMarkAsPaid) {
        await onMarkAsPaid(billId);
      }
    } catch (err) {
      console.error("Failed to mark bill as paid:", err);
      setPaying((prev) => {
        const next = new Set(prev);
        next.delete(billId);
        return next;
      });
    }
  };

  const toggleSelectRow = (billId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(billId)) next.delete(billId);
      else next.add(billId);
      return next;
    });
  };

  const allSelected =
    bills.length > 0 && bills.every((b) => selectedIds.has(b.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bills.map((b) => b.id)));
    }
  };

  return (
    <div className="glass-panel p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
            Upcoming Bills
          </h2>
          <span className="text-xs font-medium text-zinc-500 tabular-nums">
            {bills.length} due
          </span>
        </div>

        {isSelecting && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-2 h-9 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            {onBulkDelete && (
              <button
                type="button"
                onClick={() => onBulkDelete(Array.from(selectedIds))}
                className="inline-flex items-center gap-1 px-2.5 h-9 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 text-xs font-medium transition-colors cursor-pointer"
              >
                <Trash2 size={12} />
                <span>Delete ({selectedIds.size})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 px-2 h-9 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {bills.length > 0 ? (
        <ul className="divide-y divide-white/[0.05]">
          {bills.map((bill) => {
            const isPaying = paying.has(bill.id);
            const isSelected = selectedIds.has(bill.id);
            return (
              <li
                key={bill.id}
                onClick={() => {
                  if (isSelecting) {
                    toggleSelectRow(bill.id);
                  } else if (onEdit) {
                    onEdit(bill);
                  }
                }}
                className={`py-3 flex items-center justify-between gap-2 group transition-all duration-200 cursor-pointer ${
                  isPaying ? "opacity-40" : "opacity-100"
                } ${
                  isSelecting
                    ? "rounded-lg px-2 -mx-2 hover:bg-white/[0.03]"
                    : "hover:bg-white/[0.02] sm:hover:bg-transparent"
                } ${isSelecting && isSelected ? "bg-white/[0.04]" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectRow(bill.id);
                    }}
                    aria-label={`Select ${bill.title}`}
                    aria-pressed={isSelected}
                    className="w-10 h-10 -ml-2.5 -my-2 flex items-center justify-center cursor-pointer shrink-0"
                  >
                    <div
                      className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                        isSelected
                          ? "bg-zinc-100 border-zinc-100 text-zinc-950"
                          : "border-white/20 bg-zinc-900/80 hover:border-zinc-400"
                      }`}
                    >
                      {isSelected && <Check size={11} strokeWidth={3} />}
                    </div>
                  </button>
                  <div className="min-w-0">
                    <span
                      title={bill.title}
                      className={`text-sm font-medium block truncate ${
                        isPaying
                          ? "line-through text-zinc-500"
                          : "text-zinc-200"
                      }`}
                    >
                      {bill.title}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-xs text-zinc-500 tabular-nums">
                        {new Date(bill.date).toLocaleDateString("en-US", {
                          timeZone: "UTC",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="text-zinc-600 text-xs">•</span>
                      {bill.fromAccount &&
                      bill.fromAccount.type === "CREDIT_CARD" ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                          title={`Deducted from credit card: ${bill.fromAccount.name}`}
                        >
                          <CreditCard size={10} />
                          <span>{bill.fromAccount.name}</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded"
                          title="Deducted from Primary Checking"
                        >
                          <Landmark size={10} />
                          <span>
                            {bill.fromAccount?.name || "Checking"}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
                  <div className="text-right">
                    <span
                      className={`text-sm font-medium tabular-nums block ${
                        isPaying ? "line-through text-zinc-500" : "text-zinc-200"
                      }`}
                    >
                      {formatCurrency(bill.amount)}
                    </span>
                    {bill.isTaxExclusive &&
                      parseFloat(bill.taxRate) > 0 &&
                      !bill.taxApplied && (
                        <span className="text-[10px] text-amber-400/90 tabular-nums font-medium block">
                          <span className="sm:hidden">incl. tax {formatCurrency(parseFloat(bill.amount) * (1 + parseFloat(bill.taxRate) / 100))}</span>
                          <span className="hidden sm:inline">+ {parseFloat(bill.taxRate)}% tax due (~{formatCurrency(parseFloat(bill.amount) * (1 + parseFloat(bill.taxRate) / 100))})</span>
                        </span>
                      )}
                  </div>
                  {!isSelecting && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCheck(bill.id);
                      }}
                      disabled={isPaying}
                      title="Mark bill as paid"
                      aria-label={`Mark ${bill.title} as paid`}
                      className="inline-flex items-center justify-center gap-1 h-10 min-w-[60px] px-2.5 rounded-lg text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-60 transition-colors cursor-pointer"
                    >
                      <Check size={13} strokeWidth={2.5} />
                      <span>Paid</span>
                    </button>
                  )}
                  {!isSelecting && (
                    <div className="hidden sm:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(bill);
                        }}
                        title="Edit"
                        className="btn-ghost-icon"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(bill.id);
                        }}
                        title="Delete"
                        className="btn-ghost-icon hover:text-rose-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="py-8 flex flex-col items-center justify-center text-center border border-dashed border-white/[0.06] rounded-xl">
          <CheckCircle2 size={18} className="text-emerald-400/80 mb-2" />
          <p className="text-zinc-400 text-xs font-medium">
            All caught up — no upcoming bills.
          </p>
        </div>
      )}
    </div>
  );
};

export default UpcomingBills;
