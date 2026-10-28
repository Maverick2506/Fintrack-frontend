import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, AlertTriangle, Shield, Check, Pencil, X, Sparkles, ChevronDown } from "lucide-react";
import { formatCurrency, formatShortDate } from "../../utils/formatUtils";

const CustomForecastTooltip = ({ active, payload, label, buffer }) => {
  if (!active || !payload || !payload.length) return null;

  const dataPoint = payload[0].payload;
  const balance = dataPoint.balance;
  const isBelowBuffer = balance < buffer;
  const items = dataPoint.items || [];

  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-xl max-w-xs text-xs">
      <p className="font-semibold text-zinc-200 mb-1 border-b border-white/[0.08] pb-1">
        {formatShortDate(label)} ({label})
      </p>
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-zinc-400">Projected Balance:</span>
        <span
          className={`font-semibold tabular-nums ${
            isBelowBuffer ? "text-rose-400" : "text-emerald-400"
          }`}
        >
          {formatCurrency(balance)}
        </span>
      </div>

      {items.length > 0 ? (
        <div className="space-y-1 pt-1.5 border-t border-white/[0.06]">
          <p className="text-[10px] uppercase font-medium text-zinc-500 tracking-wider">
            Scheduled on this day:
          </p>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {items.map((it, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                {/* A bill a savings goal covers says so in full: "Car insurance $1,200 (fund covers $1,150)" */}
                <span
                  className={`text-zinc-300 max-w-[170px] ${it.fundCovers ? "break-words" : "truncate"}`}
                  title={it.title}
                >
                  {it.title}
                  {it.estimated && !it.title?.toLowerCase().includes("estimated") && (
                    <span className="text-zinc-500 font-normal ml-1">(est.)</span>
                  )}
                </span>
                <span
                  className={`tabular-nums font-medium shrink-0 ${
                    it.amount === 0 ? "text-zinc-400" : it.amount > 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {it.amount > 0 ? "+" : ""}
                  {formatCurrency(it.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-[10px] text-zinc-500 italic pt-1">
          No scheduled transactions
        </p>
      )}
    </div>
  );
};

const ForecastChartCard = ({
  forecast,
  onUpdateBuffer,
  isUpdatingBuffer,
  estimateIncomeEnabled = true,
  onToggleEstimateIncome,
  isUpdatingEstimateIncome = false,
}) => {
  const [editingBuffer, setEditingBuffer] = useState(false);
  const [bufferInput, setBufferInput] = useState("");
  const [isMobileExpanded, setIsMobileExpanded] = useState(false);

  if (!forecast || !forecast.days || forecast.days.length === 0) {
    return null;
  }

  const buffer = forecast.buffer || 200;
  const lowestPoint = forecast.lowestPoint || { date: forecast.today, balance: 0 };
  const isBelowBuffer = lowestPoint.balance < buffer;
  const nextPayday = forecast.nextPayday;
  const nextPaydayDay = forecast.days?.find((d) => d.date === nextPayday);
  const isNextPaydayEstimated = Boolean(nextPaydayDay?.items?.some((it) => it.estimated));

  const handleStartEdit = () => {
    setBufferInput(String(buffer));
    setEditingBuffer(true);
  };

  const handleSaveBuffer = async () => {
    const parsed = parseFloat(bufferInput);
    if (!isNaN(parsed) && parsed >= 0) {
      await onUpdateBuffer(parsed);
    }
    setEditingBuffer(false);
  };

  return (
    <div>
      {/* Mobile Collapsible Header (M5, n1, n2) */}
      <button
        type="button"
        onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        className="sm:hidden glass-panel px-4 py-3 w-full flex items-center justify-between text-xs font-medium text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <TrendingUp size={15} className="text-emerald-400" />
          <span>60-Day Cashflow Forecast</span>
        </div>
        <div className="flex items-center gap-1 text-zinc-400">
          <span className="text-[11px] font-medium text-emerald-400">
            {isMobileExpanded ? "Hide" : "Open"}
          </span>
          <ChevronDown
            size={14}
            className={`transition-transform duration-200 ${isMobileExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      <div className={`glass-panel p-4 sm:p-6 space-y-4 ${isMobileExpanded ? "block mt-3" : "hidden sm:block"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp size={16} />
          </div>
          <div>
            <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
              60-Day Cashflow Forecast
            </h2>
            <p className="text-xs text-zinc-500">
              Safe to spend:{" "}
              <span className="font-semibold text-zinc-200">
                {formatCurrency(forecast.safeToSpend)}
              </span>{" "}
              {nextPayday
                ? `until ${formatShortDate(nextPayday)} (${isNextPaydayEstimated ? "est. payday" : "payday"})`
                : "for the next 60 days"}
            </p>
          </div>
        </div>

        {/* Controls: Buffer & Estimated Paycheques Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Include Estimated Paycheques Toggle */}
          <button
            type="button"
            onClick={() => onToggleEstimateIncome && onToggleEstimateIncome(!estimateIncomeEnabled)}
            disabled={isUpdatingEstimateIncome}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer select-none ${
              estimateIncomeEnabled
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20"
                : "bg-zinc-900/80 border-white/[0.08] text-zinc-400 hover:text-zinc-300"
            }`}
            title="Toggle estimated paycheques in forecast"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                estimateIncomeEnabled ? "bg-emerald-400" : "bg-zinc-600"
              }`}
            />
            <span>
              Est. paycheques: <strong className="font-semibold">{estimateIncomeEnabled ? "On" : "Off"}</strong>
            </span>
          </button>

          {/* Buffer Badge & Editor */}
          {editingBuffer ? (
            <div className="flex items-center gap-1.5 bg-zinc-950 border border-white/10 rounded-lg px-2 py-1">
              <span className="text-xs text-zinc-500">$</span>
              <input
                type="number"
                min="0"
                step="10"
                value={bufferInput}
                onChange={(e) => setBufferInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveBuffer();
                  if (e.key === "Escape") setEditingBuffer(false);
                }}
                className="w-16 bg-transparent text-xs text-zinc-100 focus:outline-none tabular-nums"
                autoFocus
              />
              <button
                type="button"
                onClick={handleSaveBuffer}
                disabled={isUpdatingBuffer}
                className="text-emerald-400 hover:text-emerald-300 p-0.5 cursor-pointer"
                title="Save buffer"
              >
                <Check size={12} />
              </button>
              <button
                type="button"
                onClick={() => setEditingBuffer(false)}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 cursor-pointer"
                title="Cancel"
              >
                <X size={12} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/80 border border-white/[0.08] text-[11px] text-zinc-400">
              <Shield size={12} className="text-amber-400" />
              <span>Buffer: {formatCurrency(buffer, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
              <button
                type="button"
                onClick={handleStartEdit}
                className="text-zinc-500 hover:text-zinc-300 p-0.5 ml-0.5 cursor-pointer"
                title="Edit buffer"
              >
                <Pencil size={10} />
              </button>
            </div>
          )}

          {isBelowBuffer && (
            <div className="flex items-center gap-1 text-[11px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
              <AlertTriangle size={12} />
              <span>Below buffer</span>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="w-full h-44 sm:h-64 pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={forecast.days}
            margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="rgba(255,255,255,0.06)"
            />
            <XAxis
              dataKey="date"
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={(val) => formatShortDate(val)}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              stroke="#71717a"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
              tickFormatter={(v) => `$${Math.round(v)}`}
            />
            <Tooltip
              content={<CustomForecastTooltip buffer={buffer} />}
            />
            {buffer > 0 && (
              <ReferenceLine
                y={buffer}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{
                  value: `Buffer ($${Math.round(buffer)})`,
                  position: "insideTopLeft",
                  fill: "#f59e0b",
                  fontSize: 10,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="balance"
              stroke={isBelowBuffer ? "#f43f5e" : "#10b981"}
              strokeWidth={2}
              dot={(props) => {
                const { cx, cy, payload } = props;
                const isEstimated = payload?.items?.some((it) => it.estimated);
                if (isEstimated && cx !== undefined && cy !== undefined) {
                  return (
                    <circle
                      key={`dot-${payload.date}`}
                      cx={cx}
                      cy={cy}
                      r={3}
                      fill="#18181b"
                      stroke="#10b981"
                      strokeWidth={1.5}
                    />
                  );
                }
                return null;
              }}
              activeDot={{ r: 4, fill: "#ffffff", stroke: isBelowBuffer ? "#f43f5e" : "#10b981" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Estimated Income Explanation */}
      {forecast.estimatedIncome && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/50 rounded-lg px-3 py-2 border border-white/[0.06]">
          <Sparkles size={13} className="text-emerald-400 shrink-0" />
          <span>
            Includes estimated paycheques:{" "}
            <span className="text-zinc-200 font-medium">
              {formatCurrency(forecast.estimatedIncome.amount)} {forecast.estimatedIncome.cadence}
            </span>
            {forecast.estimatedIncome.typicalAmount != null &&
              forecast.estimatedIncome.typicalAmount !== forecast.estimatedIncome.amount && (
                <> (cautious; typical {formatCurrency(forecast.estimatedIncome.typicalAmount)})</>
              )}
            , based on your last {forecast.estimatedIncome.basedOn}.
          </span>
        </div>
      )}
      {forecast.incomeSource === "expected-pay" && (
        <div className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/50 rounded-lg px-3 py-2 border border-white/[0.06]">
          <Sparkles size={13} className="text-emerald-400 shrink-0" />
          <span>
            Includes your Expected pay:{" "}
            <span className="text-zinc-200 font-medium">{formatCurrency(forecast.planningAmount)}</span> per paycheque,
            until 2 paycheques are logged.
          </span>
        </div>
      )}

      {/* Footer Metrics */}
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-white/[0.06]">
        <span>
          Starting checking balance:{" "}
          <strong className="text-zinc-300 font-medium">
            {formatCurrency(forecast.startBalance)}
          </strong>
        </span>
        <span
          className={
            isBelowBuffer ? "text-rose-400 font-medium" : "text-zinc-400"
          }
        >
          Lowest: {formatCurrency(lowestPoint.balance)} on{" "}
          {formatShortDate(lowestPoint.date)}
        </span>
      </div>
    </div>
    </div>
  );
};

export default ForecastChartCard;
