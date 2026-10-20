import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, History } from "lucide-react";
import { formatCurrency, formatShortDate } from "../../utils/formatUtils";

const CustomNetWorthTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const nw = dataPoint.netWorth;
  const isPositive = nw >= 0;

  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl max-w-xs text-xs">
      <p className="font-semibold text-zinc-200 mb-1 border-b border-white/[0.08] pb-1">
        {formatShortDate(label)} ({label})
      </p>
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-zinc-400">Net Worth:</span>
        <span
          className={`font-semibold tabular-nums text-sm ${
            isPositive ? "text-emerald-400" : "text-rose-400"
          }`}
        >
          {formatCurrency(nw)}
        </span>
      </div>

      <div className="space-y-1 pt-1.5 border-t border-white/[0.06] text-[11px] tabular-nums">
        <div className="flex items-center justify-between text-zinc-400">
          <span>Checking:</span>
          <span className="text-zinc-200 font-medium">{formatCurrency(dataPoint.checking || 0)}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400">
          <span>Savings:</span>
          <span className="text-emerald-400 font-medium">{formatCurrency(dataPoint.savings || 0)}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400">
          <span>Debts:</span>
          <span className="text-rose-400 font-medium">-{formatCurrency(dataPoint.debt || 0)}</span>
        </div>
        <div className="flex items-center justify-between text-zinc-400">
          <span>Credit Cards:</span>
          <span className="text-rose-400 font-medium">-{formatCurrency(dataPoint.cards || 0)}</span>
        </div>
      </div>
    </div>
  );
};

const NetWorthHistoryChart = ({ snapshots = [], change30Days = null }) => {
  const chartData = useMemo(() => {
    return (snapshots || []).map((s) => ({
      ...s,
      displayDate: formatShortDate(s.date),
    }));
  }, [snapshots]);

  const hasData = chartData.length > 0;
  const latestSnapshot = hasData ? chartData[chartData.length - 1] : null;

  return (
    <div className="glass-panel p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              12-Month Net Worth History
            </h2>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full border border-white/[0.06]">
              Tracking since Oct 2026
            </span>
          </div>
          {change30Days && (
            <p className="text-xs text-zinc-400 mt-1">
              30-day change:{" "}
              <span
                className={`font-semibold tabular-nums ${
                  change30Days.absolute >= 0 ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {change30Days.absolute >= 0 ? "+" : ""}
                {formatCurrency(change30Days.absolute)}
                {change30Days.percentage !== null &&
                  ` (${change30Days.percentage >= 0 ? "+" : ""}${change30Days.percentage.toFixed(1)}%)`}
              </span>
            </p>
          )}
        </div>

        {latestSnapshot && (
          <div className="text-right sm:block">
            <span className="text-[11px] text-zinc-500 block">Current Net Worth</span>
            <span
              className={`text-lg font-semibold tabular-nums ${
                latestSnapshot.netWorth >= 0 ? "text-zinc-100" : "text-rose-400"
              }`}
            >
              {formatCurrency(latestSnapshot.netWorth)}
            </span>
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center px-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-zinc-500 mb-3">
            <History size={18} />
          </div>
          <p className="text-xs font-medium text-zinc-300 mb-1">
            Tracking since October 2026
          </p>
          <p className="text-[11px] text-zinc-500 max-w-sm">
            Daily sweeps record snapshots of your checking, savings, debts, and cards at midnight.
            As days pass, your wealth trend will plot here automatically.
          </p>
        </div>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 5 }}
            >
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="displayDate"
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={(val) => `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <Tooltip content={<CustomNetWorthTooltip />} />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#netWorthGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default NetWorthHistoryChart;
