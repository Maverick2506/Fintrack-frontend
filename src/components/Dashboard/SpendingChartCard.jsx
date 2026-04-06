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
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884d8",
  "#ff4d4d",
  "#4ddbff",
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
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-sm font-semibold text-gray-400 mb-3">
        SPENDING SUMMARY
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

