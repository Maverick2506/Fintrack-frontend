import React from "react";
import { formatCurrency } from "../../utils/formatUtils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { PieChart as PieChartIcon } from "lucide-react";

const COLORS = [
  "#e4e4e7", // zinc-200
  "#34d399", // emerald-400
  "#60a5fa", // blue-400
  "#a78bfa", // violet-400
  "#fbbf24", // amber-400
  "#fb7185", // rose-400
  "#71717a", // zinc-500
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 shadow-xl">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="inline-block w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: payload[0].fill }}
          />
          <p className="text-zinc-400 text-xs font-medium">{payload[0].name}</p>
        </div>
        <p className="text-zinc-100 text-sm font-semibold pl-4 tabular-nums">
          {formatCurrency(payload[0].value)}
        </p>
      </div>
    );
  }
  return null;
};

const SpendingChartCard = ({ data = [], onCategoryClick }) => {
  const hasData = Array.isArray(data) && data.some((d) => parseFloat(d.value) > 0);

  return (
    <div className="glass-panel p-6">
      <h2 className="text-xs font-medium text-zinc-400 mb-4 uppercase tracking-wider">
        Spending Breakdown
      </h2>
      {!hasData ? (
        <div className="h-[240px] flex flex-col items-center justify-center text-center px-4">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-white/[0.07] flex items-center justify-center text-zinc-500 mb-2.5">
            <PieChartIcon size={16} />
          </div>
          <p className="text-xs font-medium text-zinc-300 mb-0.5">
            No expenses recorded this month
          </p>
          <p className="text-[11px] text-zinc-500 max-w-[220px]">
            Category breakdown will appear once expenses are logged for this period.
          </p>
        </div>
      ) : (
        <div style={{ width: "100%", height: 240 }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={56}
                outerRadius={78}
                paddingAngle={3}
                stroke="none"
                dataKey="value"
                nameKey="name"
                isAnimationActive={false}
                onClick={(pieData) =>
                  onCategoryClick && onCategoryClick(pieData.name)
                }
                style={{ cursor: onCategoryClick ? "pointer" : "default" }}
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: "12px", color: "#a1a1aa" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SpendingChartCard;

