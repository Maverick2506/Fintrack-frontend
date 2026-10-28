import { X } from "lucide-react";
import useEscapeClose from "../../hooks/useEscapeClose";
import { TYPE_OPTIONS, SORT_OPTIONS, monthOptionLabel } from "../../utils/ledgerFilters";

const fieldLabel = "block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2";
const selectClass =
  "w-full h-11 bg-zinc-900 text-zinc-200 text-sm rounded-xl px-3 border border-white/[0.08] focus:outline-none focus:border-zinc-500";
const pill = (active) =>
  `h-10 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
    active ? "bg-zinc-100 text-zinc-950" : "bg-zinc-900 text-zinc-400 border border-white/[0.07] hover:text-zinc-200"
  }`;

/** Bottom sheet with the Ledger's Type, Category, Month, Tag and Sort, for screens under 1024 px. */
const LedgerFilterSheet = ({
  isOpen,
  onClose,
  categories,
  months,
  typeFilter,
  setTypeFilter,
  categoryFilter,
  setCategoryFilter,
  monthFilter,
  setMonthFilter,
  tags = [],
  tagFilter,
  setTagFilter,
  sortKey,
  sortDir,
  setSort,
  onReset,
  resultCount,
}) => {
  useEscapeClose(isOpen, onClose);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ledger-filter-title"
        className="relative z-10 bg-zinc-950 border-t border-white/[0.1] rounded-t-2xl shadow-2xl max-w-lg w-full mx-auto max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.06]">
          <h2 id="ledger-filter-title" className="text-sm font-semibold text-zinc-100">
            Filter and sort
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 -mr-2 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 overflow-y-auto">
          <div>
            <span className={fieldLabel}>Type</span>
            <div className="grid grid-cols-4 gap-1.5">
              {TYPE_OPTIONS.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={typeFilter === value}
                  onClick={() => setTypeFilter(value)}
                  className={pill(typeFilter === value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0">
              <span className={fieldLabel}>Category</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-0">
              <span className={fieldLabel}>Month</span>
              <select
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
                className={selectClass}
              >
                <option value="all">All months</option>
                {months.map((ym) => (
                  <option key={ym} value={ym}>
                    {monthOptionLabel(ym)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {(tags.length > 0 || tagFilter !== "all") && (
            <label className="block min-w-0">
              <span className={fieldLabel}>Tag</span>
              <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className={selectClass}>
                <option value="all">All tags</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    #{tag}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div>
            <span className={fieldLabel}>Sort</span>
            <div className="grid grid-cols-2 gap-1.5">
              {SORT_OPTIONS.map((o) => {
                const active = sortKey === o.key && sortDir === o.dir;
                return (
                  <button
                    key={`${o.key}:${o.dir}`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSort(o.key, o.dir)}
                    className={pill(active)}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex gap-2 px-5 pt-3 pb-5 border-t border-white/[0.06]">
          <button type="button" onClick={onReset} className="btn-secondary h-11 px-4">
            Reset
          </button>
          <button type="button" onClick={onClose} className="btn-primary h-11 flex-1">
            Show {resultCount} transaction{resultCount === 1 ? "" : "s"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LedgerFilterSheet;
