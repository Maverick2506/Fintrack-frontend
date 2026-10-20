import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Calculator,
  Sparkles,
  TrendingDown,
  Calendar,
  AlertTriangle,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import { comparePlans } from "../../utils/debtMath";
import { formatCurrency, formatMonthYear } from "../../utils/formatUtils";

const CustomPlannerTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const dataPoint = payload[0].payload;

  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl max-w-xs text-xs">
      <p className="font-semibold text-zinc-200 mb-1 border-b border-white/[0.08] pb-1">
        Month {label} {dataPoint.date ? `(${formatMonthYear(dataPoint.date)})` : ""}
      </p>
      <div className="space-y-1 pt-1 text-[11px] tabular-nums">
        <div className="flex items-center justify-between text-zinc-400">
          <span>Minimums Only:</span>
          <span className="text-zinc-300 font-medium">
            {formatCurrency(dataPoint.baselineBalance)}
          </span>
        </div>
        <div className="flex items-center justify-between text-zinc-400">
          <span className="text-emerald-400">Chosen Plan:</span>
          <span className="text-emerald-400 font-medium">
            {formatCurrency(dataPoint.plannedBalance)}
          </span>
        </div>
      </div>
    </div>
  );
};

const DebtPayoffPlanner = ({ debts = [], onEditDebt }) => {
  const [strategy, setStrategy] = useState("avalanche");
  const [extraPayment, setExtraPayment] = useState(100);

  const activeDebts = useMemo(() => {
    return debts.filter(
      (d) => (parseFloat(d.total_remaining ?? d.initialBalance ?? 0) || 0) > 0
    );
  }, [debts]);

  const missingAprDebts = useMemo(() => {
    return activeDebts.filter(
      (d) =>
        d.interest_rate === null ||
        d.interest_rate === undefined ||
        d.interest_rate === "" ||
        parseFloat(d.interest_rate) === 0
    );
  }, [activeDebts]);

  const comparison = useMemo(() => {
    if (activeDebts.length === 0) return null;
    return comparePlans(activeDebts, extraPayment, strategy);
  }, [activeDebts, extraPayment, strategy]);

  if (activeDebts.length === 0) return null;

  const { baseline, planned, interestSaved, monthsSaved, combinedSeries } =
    comparison || {};

  const QUICK_EXTRAS = [0, 50, 100, 200, 500];

  return (
    <div className="glass-panel p-6 mb-8 border border-white/[0.08]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Calculator size={15} />
            </div>
            <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wider">
              Debt Payoff Planner
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Simulate accelerated payoff strategies and see how much time and interest you save.
          </p>
        </div>

        {/* Strategy Toggle */}
        <div className="flex items-center gap-1 bg-zinc-900/80 p-1 rounded-xl border border-white/[0.08] self-start md:self-auto">
          <button
            type="button"
            onClick={() => setStrategy("avalanche")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              strategy === "avalanche"
                ? "bg-zinc-800 text-emerald-400 shadow-sm border border-white/[0.08]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Avalanche (High APR)
          </button>
          <button
            type="button"
            onClick={() => setStrategy("snowball")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              strategy === "snowball"
                ? "bg-zinc-800 text-emerald-400 shadow-sm border border-white/[0.08]"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Snowball (Low Balance)
          </button>
        </div>
      </div>

      {/* Warnings & Prompts */}
      {planned?.hasInsolventDebt && (
        <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-rose-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Payment warning:</span> Minimum payments on{" "}
            {planned.insolventDebts.map((d) => d.name).join(", ")} do not cover monthly interest ($
            {planned.insolventDebts[0]?.solvencyInterest}/mo). That balance will grow without higher payments.
          </div>
        </div>
      )}

      {missingAprDebts.length > 0 && (
        <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle size={15} className="text-amber-400 shrink-0" />
            <span>
              {missingAprDebts.length === 1
                ? `"${missingAprDebts[0].name}" has no interest rate set.`
                : `${missingAprDebts.length} debts have no interest rate set.`}{" "}
              Add the interest rate for an accurate estimate.
            </span>
          </div>
          {onEditDebt && (
            <button
              type="button"
              onClick={() => onEditDebt(missingAprDebts[0])}
              className="text-xs font-medium text-amber-400 hover:text-amber-300 underline underline-offset-2 shrink-0 flex items-center gap-1"
            >
              <Pencil size={11} />
              <span>Edit {missingAprDebts[0].name}</span>
            </button>
          )}
        </div>
      )}

      {/* Extra Payment Control */}
      <div className="glass-card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <label className="text-xs font-medium text-zinc-300 flex items-center gap-2">
            <Sparkles size={14} className="text-emerald-400" />
            <span>Extra Contribution Per Month</span>
          </label>
          <div className="flex items-center gap-1.5">
            {QUICK_EXTRAS.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setExtraPayment(amount)}
                className={`px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
                  extraPayment === amount
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-white/[0.06]"
                }`}
              >
                +{formatCurrency(amount, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <input
            type="range"
            min="0"
            max="1500"
            step="25"
            value={extraPayment}
            onChange={(e) => setExtraPayment(parseFloat(e.target.value) || 0)}
            className="w-full accent-emerald-500 bg-zinc-800 h-1.5 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex items-center gap-1 min-w-[100px]">
            <span className="text-xs text-zinc-500">$</span>
            <input
              type="number"
              min="0"
              step="10"
              value={extraPayment}
              onChange={(e) => setExtraPayment(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-20 bg-zinc-950 text-zinc-100 rounded px-2 py-1 text-xs border border-white/10 tabular-nums focus:outline-none focus:border-emerald-500/50"
            />
            <span className="text-xs text-zinc-500">/mo</span>
          </div>
        </div>
      </div>

      {/* KPI Results Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mb-6">
        <div className="glass-card p-3.5">
          <p className="text-[11px] text-zinc-500 mb-0.5">Target Debt-Free Date</p>
          <p className="text-lg font-semibold text-zinc-100 tabular-nums">
            {planned?.debtFreeDate ? formatMonthYear(planned.debtFreeDate) : "—"}
          </p>
          <p className="text-[11px] text-zinc-500">
            {planned?.debtFreeMonth ? `In ~${planned.debtFreeMonth} months` : "Not reachable"}
          </p>
        </div>

        <div className="glass-card p-3.5">
          <p className="text-[11px] text-zinc-500 mb-0.5">Total Interest Paid</p>
          <p className="text-lg font-semibold text-zinc-100 tabular-nums">
            {formatCurrency(planned?.totalInterest || 0)}
          </p>
          <p className="text-[11px] text-zinc-500">
            Min-only: {formatCurrency(baseline?.totalInterest || 0)}
          </p>
        </div>

        <div className="glass-card p-3.5">
          <p className="text-[11px] text-zinc-500 mb-0.5">Interest Saved</p>
          <p className="text-lg font-semibold text-emerald-400 tabular-nums">
            {interestSaved > 0 ? `+${formatCurrency(interestSaved)}` : "$0.00"}
          </p>
          <p className="text-[11px] text-zinc-500">vs minimums only</p>
        </div>

        <div className="glass-card p-3.5">
          <p className="text-[11px] text-zinc-500 mb-0.5">Time Saved</p>
          <p className="text-lg font-semibold text-emerald-400 tabular-nums">
            {monthsSaved > 0
              ? `${monthsSaved} ${monthsSaved === 1 ? "month" : "months"}`
              : "0 months"}
          </p>
          <p className="text-[11px] text-zinc-500">
            {monthsSaved > 0 ? "Debt-free sooner" : "At minimum pace"}
          </p>
        </div>
      </div>

      {/* Comparison Chart */}
      {combinedSeries && combinedSeries.length > 1 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              Payoff Trajectory Comparison
            </h3>
            <span className="text-[11px] text-zinc-500">
              Green = with {formatCurrency(extraPayment)}/mo extra · Gray = minimums only
            </span>
          </div>
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart
                data={combinedSeries}
                margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="month"
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(m) => `M${m}`}
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) =>
                    `$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`
                  }
                />
                <Tooltip content={<CustomPlannerTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) => (
                    <span className="text-zinc-400">{value}</span>
                  )}
                />
                <Line
                  type="monotone"
                  dataKey="baselineBalance"
                  name="Minimums Only"
                  stroke="#71717a"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="plannedBalance"
                  name={`Plan (+${formatCurrency(extraPayment)}/mo)`}
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-Debt Payoff Schedule */}
      {planned?.perDebt && planned.perDebt.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2.5">
            Per-Debt Payoff Schedule
          </h3>
          <div className="space-y-1.5">
            {planned.perDebt.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-zinc-900/60 border border-white/[0.04]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 font-medium">{d.name}</span>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                    {d.apr > 0 ? `${d.apr}% APR` : "0% / unset"}
                  </span>
                </div>
                <div className="flex items-center gap-4 tabular-nums text-[11px]">
                  <span className="text-zinc-400">
                    Remaining:{" "}
                    <span className="text-zinc-200 font-medium">
                      {formatCurrency(d.originalBalance)}
                    </span>
                  </span>
                  <span className="text-zinc-400">
                    Interest:{" "}
                    <span className="text-zinc-300">
                      {formatCurrency(d.totalInterest)}
                    </span>
                  </span>
                  <span className="text-emerald-400 font-medium">
                    {d.payoffDate ? `Paid off ${formatMonthYear(d.payoffDate)}` : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DebtPayoffPlanner;
