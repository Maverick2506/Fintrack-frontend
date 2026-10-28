import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, TrendingUp, TrendingDown, Tag, PiggyBank, CalendarCheck } from "lucide-react";
import dashboardService from "../../services/dashboardService";
import { formatCurrency } from "../../utils/formatUtils";
import { signedCurrency, budgetUsePercent, commentaryErrorNote } from "../../utils/monthClose";

const sectionTitle = "text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2";

// A name that truncates next to an amount that never does
const Row = ({ name, children, sub }) => (
  <div className="flex items-start justify-between gap-3 py-1.5">
    <div className="min-w-0">
      <p className="text-sm text-zinc-200 truncate">{name}</p>
      {sub && <p className="text-[11px] text-zinc-500 truncate">{sub}</p>}
    </div>
    <div className="text-sm tabular-nums text-right whitespace-nowrap shrink-0">{children}</div>
  </div>
);

const Tile = ({ label, value, sub, tone = "text-zinc-100" }) => (
  <div className="glass-card p-3 min-w-0">
    <p className="text-[11px] text-zinc-500 mb-0.5">{label}</p>
    <p className={`text-base sm:text-lg font-semibold tabular-nums break-words ${tone}`}>{value}</p>
    {sub && <p className="text-[11px] text-zinc-500 mt-0.5">{sub}</p>}
  </div>
);

/**
 * Reports → Month close: the month's numbers from the server, and Gemini's short note about them.
 * The note costs an AI call, so it is only asked for while the card is on screen (isVisible): on its
 * own for a month that is over, and with "Write a note" for the month in progress, whose numbers
 * change every day.
 */
const MonthCloseCard = ({ month, isAiAvailable, isVisible = true }) => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["monthClose", month],
    queryFn: () => dashboardService.fetchMonthClose(month),
    enabled: Boolean(month),
  });
  // The month (and its numbers) the person asked a note for
  const [requestedKey, setRequestedKey] = useState(null);

  // The server returns a written note for these exact numbers; commentaryKey changes when they do
  const canWrite = Boolean(data) && data.commentary === null && isAiAvailable;
  const wantsNote = canWrite && isVisible && (data.isComplete || requestedKey === data.commentaryKey);
  const commentaryQuery = useQuery({
    queryKey: ["monthCloseCommentary", month, data?.commentaryKey],
    queryFn: () => dashboardService.fetchMonthCloseCommentary(month),
    enabled: wantsNote,
    retry: false,
    staleTime: Infinity,
  });

  if (!month) {
    return (
      <div className="glass-panel p-6 text-sm text-zinc-500 text-center">This month hasn&apos;t started yet.</div>
    );
  }
  if (isLoading) {
    return <div className="glass-panel p-6 text-sm text-zinc-500 text-center">Loading month close…</div>;
  }
  if (error || !data) {
    return (
      <div className="glass-panel p-6 text-center">
        <p className="text-rose-400 text-sm mb-3">Couldn&apos;t load the month close.</p>
        <button type="button" onClick={() => refetch()} className="btn-secondary h-10 px-4 mx-auto cursor-pointer">
          Retry
        </button>
      </div>
    );
  }

  const lines = data.commentary || commentaryQuery.data?.lines || [];
  const capNote = commentaryQuery.error ? commentaryErrorNote(commentaryQuery.error) : null;
  const t = data.totals;
  const budgeted = data.categories.filter((c) => c.budget !== null);
  const unbudgeted = data.categories.filter((c) => c.budget === null && c.spent !== 0);

  return (
    <div className="glass-panel p-4 sm:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-zinc-100 min-w-0">
          <CalendarCheck size={16} className="text-emerald-400 shrink-0" />
          <span className="truncate">{data.label} close</span>
        </h2>
        {!data.isComplete && (
          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 shrink-0">
            So far
          </span>
        )}
      </div>

      {/* The month in progress: the note is written only when asked for */}
      {canWrite && !data.isComplete && requestedKey !== data.commentaryKey && (
        <button
          type="button"
          onClick={() => setRequestedKey(data.commentaryKey)}
          className="w-full min-h-[40px] inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] px-3 text-xs font-medium text-emerald-300 hover:bg-emerald-500/[0.1] cursor-pointer"
        >
          <Sparkles size={13} />
          Write a note about this month so far
        </button>
      )}

      {/* Gemini's note: words only, every number in it comes from the cards below */}
      {(lines.length > 0 || commentaryQuery.isFetching || capNote) && (
        <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.05] px-3.5 py-3">
          {commentaryQuery.isFetching && lines.length === 0 ? (
            <p className="flex items-center gap-2 text-xs text-zinc-400">
              <Sparkles size={13} className="text-emerald-400 animate-pulse" />
              Writing a short note…
            </p>
          ) : lines.length > 0 ? (
            <ul className="space-y-1.5">
              {lines.map((line) => (
                <li key={line} className="flex gap-2 text-sm text-zinc-200 leading-snug">
                  <Sparkles size={13} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-zinc-400">{capNote}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Tile
          label="Spent"
          value={formatCurrency(t.spending)}
          tone="text-rose-300"
          sub={t.previousSpending > 0 ? `${signedCurrency(t.spendingChange)} vs last month` : null}
        />
        <Tile label="Income" value={formatCurrency(t.income)} tone="text-emerald-300" sub={`Net ${signedCurrency(t.net)}`} />
        <Tile
          label="Budgets"
          value={t.budgeted > 0 ? `${formatCurrency(t.spentInBudgeted, { maximumFractionDigits: 0 })} of ${formatCurrency(t.budgeted, { maximumFractionDigits: 0 })}` : "None set"}
          tone={t.overBudgetCount > 0 ? "text-amber-300" : "text-zinc-100"}
          sub={t.budgeted > 0 ? (t.overBudgetCount > 0 ? `${t.overBudgetCount} over budget` : "All within budget") : null}
        />
        <Tile
          label="Net worth"
          value={data.netWorth ? signedCurrency(data.netWorth.change) : "—"}
          tone={!data.netWorth ? "text-zinc-500" : data.netWorth.change >= 0 ? "text-emerald-300" : "text-rose-300"}
          sub={data.netWorth ? `${formatCurrency(data.netWorth.end)} now` : "No history for this month"}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="min-w-0">
          <p className={sectionTitle}>Spending vs budget</p>
          {data.categories.length === 0 ? (
            <p className="text-xs text-zinc-500">No paid spending this month.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {budgeted.map((c) => (
                <div key={c.category} className="py-2">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm text-zinc-200 truncate min-w-0">{c.category}</p>
                    <p className="text-sm tabular-nums whitespace-nowrap shrink-0">
                      <span className={c.overBudget ? "text-rose-300" : "text-zinc-100"}>{formatCurrency(c.spent)}</span>
                      <span className="text-zinc-500"> / {formatCurrency(c.budget)}</span>
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.overBudget ? "bg-rose-400" : "bg-emerald-400"}`}
                      style={{ width: `${budgetUsePercent(c.spent, c.budget).toFixed(1)}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
                    {c.overBudget ? `${formatCurrency(-c.remaining)} over` : `${formatCurrency(c.remaining)} left`}
                  </p>
                </div>
              ))}
              {unbudgeted.map((c) => (
                <Row key={c.category} name={c.category} sub="No budget">
                  <span className="text-zinc-100">{formatCurrency(c.spent)}</span>
                </Row>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5 min-w-0">
          <div>
            <p className={sectionTitle}>Biggest changes vs last month</p>
            {data.increases.length === 0 && data.decreases.length === 0 ? (
              <p className="text-xs text-zinc-500">No change from last month.</p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {data.increases.map((m) => (
                  <Row key={`up-${m.category}`} name={m.category} sub={`${formatCurrency(m.previous)} → ${formatCurrency(m.spent)}`}>
                    <span className="inline-flex items-center gap-1 text-rose-300">
                      <TrendingUp size={13} />
                      {signedCurrency(m.change)}
                    </span>
                  </Row>
                ))}
                {data.decreases.map((m) => (
                  <Row key={`down-${m.category}`} name={m.category} sub={`${formatCurrency(m.previous)} → ${formatCurrency(m.spent)}`}>
                    <span className="inline-flex items-center gap-1 text-emerald-300">
                      <TrendingDown size={13} />
                      {signedCurrency(m.change)}
                    </span>
                  </Row>
                ))}
              </div>
            )}
          </div>

          {data.priceRises.length > 0 && (
            <div>
              <p className={sectionTitle}>Price rises</p>
              <div className="divide-y divide-white/[0.04]">
                {data.priceRises.map((p) => (
                  <Row key={`${p.name}-${p.date}`} name={p.name} sub={`${formatCurrency(p.from)} → ${formatCurrency(p.to)}`}>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Tag size={12} />
                      {signedCurrency(p.difference)}
                      {p.percent ? ` (${p.percent}%)` : ""}
                    </span>
                  </Row>
                ))}
              </div>
            </div>
          )}

          {data.goals.length > 0 && (
            <div>
              <p className={sectionTitle}>Goals</p>
              <div className="divide-y divide-white/[0.04]">
                {data.goals.map((g) => (
                  <div key={g.id} className="py-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-sm text-zinc-200 min-w-0">
                        <PiggyBank size={13} className="text-emerald-400 shrink-0" />
                        <span className="truncate">{g.name}</span>
                      </p>
                      <p className="text-sm tabular-nums whitespace-nowrap shrink-0 text-zinc-100">
                        {formatCurrency(g.saved)}
                        {g.target ? <span className="text-zinc-500"> / {formatCurrency(g.target)}</span> : null}
                      </p>
                    </div>
                    {g.target ? (
                      <div className="mt-1.5 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full rounded-full bg-emerald-400" style={{ width: `${g.percent}%` }} />
                      </div>
                    ) : null}
                    <p className="text-[11px] text-zinc-500 mt-1 tabular-nums">
                      {g.contributed !== 0 ? `${signedCurrency(g.contributed)} this month` : "Nothing added this month"}
                      {g.percent !== null ? ` · ${g.percent}%` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MonthCloseCard;
