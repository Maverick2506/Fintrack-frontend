import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

const COLORS = [
  "#34d399", // emerald-400
  "#2dd4bf", // teal-400
  "#3b82f6", // blue-500
  "#818cf8", // indigo-400
  "#c084fc", // purple-400
  "#fb7185", // rose-400
  "#fbbf24", // amber-400
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 6, padding: "8px 12px" }}>
        <div className="flex items-center gap-2 mb-1">
          <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, backgroundColor: payload[0].fill, flexShrink: 0 }} />
          <p className="text-gray-300 text-xs font-semibold">{payload[0].name}</p>
        </div>
        <p className="text-white text-sm font-bold pl-[18px]">
          ${parseFloat(payload[0].value).toFixed(2)}
        </p>
      </div>
    );
  }
  return null;
};

// Component now accepts an onCategoryClick prop
const SpendingChartCard = ({ data, onCategoryClick }) => {
  return (
    <div className="glass-panel p-6">
      <h2 className="text-sm tracking-widest font-bold text-gray-400/80 mb-6 uppercase">
        Spending Summary
      </h2>
      <div style={{ width: "100%", height: 250 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              onClick={(pieData) => onCategoryClick && onCategoryClick(pieData.name)}
              style={{ cursor: "pointer" }}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SpendingChartCard;

