import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { BarChart3 } from "lucide-react";

const SpendingTrendsChart = ({ data = [] }) => {
  const hasActivity =
    Array.isArray(data) &&
    data.some((d) => (parseFloat(d.income) || 0) > 0 || (parseFloat(d.spending) || 0) > 0);

  return (
    <div className="glass-panel p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
          6-Month Cash Flow Trends
        </h2>
        {!hasActivity && (
          <span className="text-[11px] text-zinc-500">
            No cash flow in last 6 months
          </span>
        )}
      </div>
      {!hasActivity ? (
        <div className="h-[220px] flex flex-col items-center justify-center text-center px-4">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-zinc-500 mb-2.5">
            <BarChart3 size={16} />
          </div>
          <p className="text-xs font-medium text-zinc-300 mb-0.5">
            No 6-month trend data yet
          </p>
          <p className="text-[11px] text-zinc-500 max-w-xs">
            Monthly income and spending bars will populate here as you log transactions.
          </p>
        </div>
      ) : (
        <div style={{ width: "100%", height: 260 }}>
          <ResponsiveContainer>
            <BarChart
              data={data}
              margin={{ top: 5, right: 10, left: -15, bottom: 5 }}
              barGap={6}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="name"
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#71717a"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
                contentStyle={{
                  backgroundColor: "#18181b",
                  borderColor: "rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#f4f4f5",
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
              />
              <Bar
                dataKey="income"
                fill="#34d399"
                name="Income"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="spending"
                fill="#fb7185"
                name="Spending"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SpendingTrendsChart;
