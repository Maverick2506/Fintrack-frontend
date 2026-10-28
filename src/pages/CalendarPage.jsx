import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays, Shield, AlertTriangle } from "lucide-react";
import dashboardService from "../services/dashboardService";
import { formatCurrency, formatShortDate } from "../utils/formatUtils";
import { buildForecastCalendar, compactBalance, daysBelowBuffer } from "../utils/forecastCalendar";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

const DayPanel = ({ cell, buffer }) => (
  <div className="mt-3 rounded-xl border border-white/[0.08] bg-zinc-900/60 p-3.5">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-100">
          {formatShortDate(cell.date)}
          {cell.isToday ? " · Today" : ""}
        </p>
        <p className="text-[11px] text-zinc-500">Projected end-of-day balance</p>
      </div>
      <p
        className={`text-base font-semibold tabular-nums whitespace-nowrap shrink-0 ${
          cell.belowBuffer ? "text-rose-400" : "text-emerald-400"
        }`}
      >
        {formatCurrency(cell.balance)}
      </p>
    </div>
    {cell.belowBuffer && (
      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-rose-300">
        <AlertTriangle size={12} className="shrink-0" />
        Under your {formatCurrency(buffer, { maximumFractionDigits: 0 })} buffer
      </p>
    )}
    {cell.income.length + cell.bills.length === 0 ? (
      <p className="mt-2 text-xs text-zinc-500">Nothing scheduled.</p>
    ) : (
      <ul className="mt-2.5 space-y-1.5 border-t border-white/[0.06] pt-2.5">
        {[...cell.income, ...cell.bills].map((it, i) => (
          <li key={`${it.title}-${i}`} className="flex items-start justify-between gap-3 text-xs">
            <span className="text-zinc-300 min-w-0 break-words">
              {it.title}
              {it.estimated && !String(it.title).toLowerCase().includes("estimated") && (
                <span className="text-zinc-500"> (est.)</span>
              )}
            </span>
            <span
              className={`tabular-nums font-medium whitespace-nowrap shrink-0 ${
                it.amount > 0 ? "text-emerald-400" : "text-rose-300"
              }`}
            >
              {it.amount > 0 ? "+" : ""}
              {formatCurrency(it.amount)}
            </span>
          </li>
        ))}
      </ul>
    )}
  </div>
);

/** Cash-flow calendar: bills, paydays and the projected end-of-day balance from GET /forecast */
const CalendarPage = () => {
  // Same query as the Dashboard's forecast card, so coming from there needs no new request
  const { data: forecast, isLoading, error, refetch } = useQuery({
    queryKey: ["forecast"],
    queryFn: () => dashboardService.fetchForecast(60),
  });
  const months = useMemo(() => buildForecastCalendar(forecast), [forecast]);
  const lowDays = useMemo(() => daysBelowBuffer(forecast), [forecast]);
  const [selected, setSelected] = useState(null);
  const selectedDate = selected || forecast?.today;
  const buffer = Number(forecast?.buffer) || 0;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pb-24 pt-5">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 h-10 -ml-1 px-1 text-xs font-medium text-zinc-400 hover:text-zinc-200"
      >
        <ArrowLeft size={14} />
        Dashboard
      </Link>
      <div className="flex items-center gap-2.5 mt-1 mb-4">
        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-emerald-400 shrink-0">
          <CalendarDays size={17} />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">Cash-flow calendar</h1>
          {forecast && (
            <p className="text-xs text-zinc-500">
              Safe to spend <span className="text-zinc-200 font-semibold">{formatCurrency(forecast.safeToSpend)}</span>
              {forecast.nextPayday ? ` until ${formatShortDate(forecast.nextPayday)}` : ""}
            </p>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="glass-panel p-8 text-center text-sm text-zinc-500">Loading forecast…</div>
      ) : error || !forecast ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-rose-400 text-sm mb-3">Couldn&apos;t load the forecast.</p>
          <button type="button" onClick={() => refetch()} className="btn-secondary h-10 px-4 mx-auto cursor-pointer">
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4 text-[11px] text-zinc-400">
            <span className="inline-flex items-center gap-1.5">
              <Shield size={12} className="text-amber-400" />
              Buffer {formatCurrency(buffer, { maximumFractionDigits: 0 })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/30 border border-rose-500/50" />
              Under buffer
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              Payday
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Bill
            </span>
          </div>

          {lowDays.length > 0 && (
            <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/[0.06] px-3 py-2.5 text-xs text-rose-200">
              <AlertTriangle size={14} className="shrink-0 mt-0.5" />
              <span>
                {lowDays.length} day{lowDays.length === 1 ? "" : "s"} under your buffer, first on{" "}
                {formatShortDate(lowDays[0])}.
              </span>
            </div>
          )}

          <div className="space-y-6">
            {months.map((month) => {
              const selectedCell = month.weeks.flat().find((c) => c?.inForecast && c.date === selectedDate);
              return (
                <section key={month.key} className="glass-panel p-3 sm:p-5">
                  <h2 className="text-sm font-semibold text-zinc-200 mb-2.5">{month.label}</h2>
                  <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-zinc-500 mb-1">
                    {WEEKDAYS.map((d, i) => (
                      <span key={i}>{d}</span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {month.weeks.flat().map((cell, i) => {
                      if (!cell) return <span key={`blank-${i}`} />;
                      if (!cell.inForecast) {
                        return (
                          <span
                            key={cell.date}
                            className="min-h-14 rounded-lg flex items-start justify-center pt-1.5 text-[11px] text-zinc-700"
                          >
                            {cell.day}
                          </span>
                        );
                      }
                      const isSelected = cell.date === selectedDate;
                      return (
                        <button
                          key={cell.date}
                          type="button"
                          onClick={() => setSelected(cell.date)}
                          aria-pressed={isSelected}
                          aria-label={`${formatShortDate(cell.date)}: ${formatCurrency(cell.balance)}${
                            cell.belowBuffer ? ", under buffer" : ""
                          }${cell.isPayday ? ", payday" : ""}${cell.bills.length ? `, ${cell.bills.length} bill(s)` : ""}`}
                          className={`min-h-14 min-w-0 rounded-lg border px-0.5 pt-1 pb-1.5 flex flex-col items-center justify-between cursor-pointer transition-colors ${
                            cell.belowBuffer
                              ? "bg-rose-500/[0.14] border-rose-500/40 hover:bg-rose-500/[0.2]"
                              : "bg-zinc-900/50 border-white/[0.05] hover:border-white/[0.15]"
                          } ${isSelected ? "ring-2 ring-zinc-100/70" : ""}`}
                        >
                          <span
                            className={`text-[11px] leading-none ${
                              cell.isToday ? "font-bold text-zinc-100" : "text-zinc-400"
                            }`}
                          >
                            {cell.day}
                          </span>
                          <span className="flex items-center gap-0.5 h-1.5">
                            {cell.isPayday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            {cell.bills.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />}
                          </span>
                          <span
                            className={`w-full text-[10px] sm:text-[11px] leading-none tabular-nums whitespace-nowrap ${
                              cell.belowBuffer ? "text-rose-300 font-semibold" : "text-zinc-300"
                            }`}
                          >
                            {compactBalance(cell.balance)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  {selectedCell && <DayPanel cell={selectedCell} buffer={buffer} />}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default CalendarPage;
