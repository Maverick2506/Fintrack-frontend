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

const SpendingTrendsChart = ({ data }) => {
  return (
    <div className="glass-panel p-6">
      <h2 className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-5">
        6-Month Cash Flow Trends
      </h2>
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
    </div>
  );
};

export default SpendingTrendsChart;
