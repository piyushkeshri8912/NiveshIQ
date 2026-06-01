"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { SectorExposure } from "@/lib/api";

interface AllocationChartProps {
  sectors: SectorExposure[];
}

// Harmonious vibrant dark HSL colors
const COLORS = [
  "#4f46e5", // Indigo
  "#06b6d4", // Cyan
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#ef4444", // Red
  "#14b8a6", // Teal
  "#6b7280", // Gray fallback
];

export default function AllocationChart({ sectors }: AllocationChartProps) {
  if (sectors.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-3xl text-zinc-500">
        No asset allocations calculated.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-zinc-200 p-3 rounded-2xl shadow-xl dark:bg-zinc-950 dark:border-zinc-800 space-y-0.5">
          <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50">{data.sector}</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            Value: ₹{data.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            Ratio: {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-baseline">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
            Sector Exposure
          </h3>
          <p className="text-xs text-zinc-400">Portfolio allocation spread by industry sector</p>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 items-center">
        {/* Recharts Pie Donut visual */}
        <div className="h-56 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={sectors}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
                nameKey="sector"
              >
                {sectors.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          {/* Inner Donut Summary widget */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Sectors</span>
            <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mt-0.5">
              {sectors.length}
            </span>
          </div>
        </div>

        {/* Legend sidebar */}
        <div className="space-y-2.5 max-h-56 overflow-y-auto pr-2">
          {sectors.map((entry, index) => (
            <div key={entry.sector} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-xs">
                  {entry.sector}
                </span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {entry.percentage.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
