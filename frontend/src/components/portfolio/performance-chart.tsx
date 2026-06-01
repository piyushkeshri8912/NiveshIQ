"use client";


import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { PortfolioSnapshotResponse } from "@/lib/api";

interface PerformanceChartProps {
  history: PortfolioSnapshotResponse[];
}

export default function PerformanceChart({ history }: PerformanceChartProps) {
  // Map history to chart points
  const chartData = history.map((snap) => ({
    date: new Date(snap.captured_at).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    value: snap.total_value,
    cost: snap.total_cost,
  }));

  if (history.length === 0) {
    return (
      <div className="h-72 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl flex flex-col items-center justify-center text-center p-6 bg-zinc-50/50 dark:bg-zinc-900/30">
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          No Net Asset Value History Logged Yet
        </p>
        <p className="text-xs text-zinc-400 max-w-xs mt-1">
          Historical performance snapshots will accumulate daily once active holdings are logged.
        </p>
      </div>
    );
  }

  // If we have exactly 1 snapshot (Day 0), standard Area chart looks empty.
  // We can render a simplified widget or double the data point to show a flat baseline.
  const paddedData = 
    chartData.length === 1 
      ? [
          { ...chartData[0], date: "Initial" }, 
          { ...chartData[0], date: "Current" }
        ] 
      : chartData;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border border-zinc-200 p-4 rounded-2xl shadow-xl dark:bg-zinc-950 dark:border-zinc-800 space-y-1">
          <p className="text-xs text-zinc-400 font-semibold">{payload[0].payload.date}</p>
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
            Value: ₹{payload[0].value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs font-medium text-zinc-500">
            Cost Basis: ₹{payload[0].payload.cost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
            Net Asset Value History
          </h3>
          <p className="text-xs text-zinc-400">Time-series tracking of your portfolio worth (Real Data Only)</p>
        </div>
        {history.length === 1 && (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 animate-pulse">
            Seeding Day 0 Snapshot
          </span>
        )}
      </div>

      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={paddedData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" className="dark:stroke-zinc-800" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "#a1a1aa", fontSize: 11 }}
              tickFormatter={(v) => `₹${v.toLocaleString(undefined, { notation: "compact" })}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#4f46e5"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
