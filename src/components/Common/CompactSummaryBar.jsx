/**
 * CompactSummaryBar - Shared responsive 3-metric summary panel (M3)
 * On mobile phones: condensed into one sleek panel with 3 side-by-side metrics.
 * On sm+ screens: expands to generous padding, larger typography, and helpful subtitles.
 */
const CompactSummaryBar = ({ items = [], className = "mb-6" }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className={`glass-panel p-3 sm:p-5 ${className}`}>
      <div className="grid grid-cols-3 gap-2 sm:gap-4 divide-x divide-white/[0.06]">
        {items.map((item, idx) => {
          const colorClass = item.colorClass || "text-zinc-100";
          return (
            <div
              key={idx}
              className={`min-w-0 ${idx > 0 ? "pl-2.5 sm:pl-4" : ""}`}
              title={item.tooltip || undefined}
            >
              <div className="flex items-center justify-between gap-1 mb-0.5 sm:mb-1">
                <p className="text-[11px] sm:text-xs font-medium text-zinc-500 truncate">
                  <span className="sm:hidden">{item.shortLabel || item.label}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                </p>
                {item.headerBadge && (
                  <div className="hidden sm:block shrink-0">{item.headerBadge}</div>
                )}
              </div>

              <div className="flex items-baseline gap-1 truncate">
                <p className={`text-base sm:text-2xl font-semibold tabular-nums truncate ${colorClass}`}>
                  {item.value}
                </p>
                {item.unit && (
                  <span className="text-[10px] sm:text-xs font-normal text-zinc-500 shrink-0">
                    {item.unit}
                  </span>
                )}
              </div>

              {item.subtitle && (
                <p className="hidden sm:block text-[11px] text-zinc-500 mt-1 truncate">
                  {item.subtitle}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CompactSummaryBar;
