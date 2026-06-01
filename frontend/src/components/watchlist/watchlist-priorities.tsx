"use client";

import { WatchlistPriorityResponse } from "@/lib/api";

interface WatchlistPrioritiesProps {
  items: WatchlistPriorityResponse[];
  loading: boolean;
}

export default function WatchlistPriorities({
  items,
  loading,
}: WatchlistPrioritiesProps) {
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse mb-8">
        <div className="h-6 w-56 bg-zinc-200 dark:bg-zinc-800 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 h-48 shadow-sm"></div>
          ))}
        </div>
      </div>
    );
  }

  // Filter or take top 3 recommendations
  const topPicks = items.slice(0, 3);

  if (topPicks.length === 0) return null;

  const getCompatibilityColors = (comp: string) => {
    switch (comp) {
      case "EXCELLENT":
        return {
          glow: "shadow-emerald-500/10 dark:shadow-emerald-400/5 border-emerald-200 dark:border-emerald-900/40 bg-gradient-to-br from-emerald-50/30 to-white dark:from-emerald-950/10 dark:to-zinc-900",
          badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
          gauge: "stroke-emerald-500",
          gaugeBg: "stroke-emerald-100 dark:stroke-emerald-950",
          scoreText: "text-emerald-600 dark:text-emerald-400",
        };
      case "GOOD":
        return {
          glow: "shadow-indigo-500/10 dark:shadow-indigo-400/5 border-indigo-200 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/30 to-white dark:from-indigo-950/10 dark:to-zinc-900",
          badge: "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30",
          gauge: "stroke-indigo-500",
          gaugeBg: "stroke-indigo-100 dark:stroke-indigo-950",
          scoreText: "text-indigo-600 dark:text-indigo-400",
        };
      case "NEUTRAL":
        return {
          glow: "shadow-amber-500/10 dark:shadow-amber-400/5 border-amber-200 dark:border-amber-900/40 bg-gradient-to-br from-amber-50/30 to-white dark:from-amber-950/10 dark:to-zinc-900",
          badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
          gauge: "stroke-amber-500",
          gaugeBg: "stroke-amber-100 dark:stroke-amber-950",
          scoreText: "text-amber-600 dark:text-amber-400",
        };
      case "AVOID":
      default:
        return {
          glow: "shadow-rose-500/10 dark:shadow-rose-400/5 border-rose-200 dark:border-rose-900/40 bg-gradient-to-br from-rose-50/30 to-white dark:from-rose-950/10 dark:to-zinc-900",
          badge: "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900/30",
          gauge: "stroke-rose-500",
          gaugeBg: "stroke-rose-100 dark:stroke-rose-950",
          scoreText: "text-rose-600 dark:text-rose-400",
        };
    }
  };

  const formatPrice = (price?: number, symbol?: string) => {
    if (price === undefined) return "—";
    const isIndian = symbol?.endsWith(".NS") || symbol?.endsWith(".BO");
    return isIndian
      ? `₹${price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
            Watchlist Priority Picks
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Top candidates calculated based on sector diversification, profile cap-size, and risk alignment.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topPicks.map((pick) => {
          const colors = getCompatibilityColors(pick.compatibility);
          
          // Radial gauge settings
          const radius = 28;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (pick.fit_score / 10.0) * circumference;

          return (
            <div
              key={pick.id}
              className={`relative border rounded-[2rem] p-6 shadow-sm transition-all duration-300 hover:translate-y-[-4px] hover:shadow-lg ${colors.glow}`}
            >
              {/* Top Row: Symbol Info + Gauge */}
              <div className="flex justify-between items-start mb-4">
                <div className="space-y-1">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${colors.badge}`}>
                    {pick.compatibility} FIT
                  </span>
                  <div className="pt-1.5">
                    <h4 className="text-base font-extrabold text-zinc-950 dark:text-zinc-50 leading-none">
                      {pick.symbol}
                    </h4>
                    <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 mt-1 block max-w-[130px] truncate">
                      {pick.company_name}
                    </span>
                  </div>
                </div>

                {/* Circular Score Gauge */}
                <div className="relative flex items-center justify-center h-16 w-16">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      className={colors.gaugeBg}
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="32"
                      cy="32"
                      r={radius}
                      className={`${colors.gauge} transition-all duration-500`}
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={circumference}
                      strokeDashoffset={strokeDashoffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className={`text-xs font-black ${colors.scoreText}`}>
                      {pick.fit_score.toFixed(1)}
                    </span>
                    <span className="text-[8px] font-extrabold text-zinc-400 dark:text-zinc-500 uppercase">
                      Score
                    </span>
                  </div>
                </div>
              </div>

              {/* Price and Metadata details */}
              <div className="grid grid-cols-2 gap-4 bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150/40 dark:border-zinc-850/50 rounded-2xl p-3 mb-4">
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                    Live Price
                  </span>
                  <span className="text-xs font-extrabold text-zinc-800 dark:text-zinc-200">
                    {formatPrice(pick.market_price, pick.symbol)}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                    Sector
                  </span>
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate block">
                    {pick.sector || "Other"}
                  </span>
                </div>
              </div>

              {/* Commentary/Insight Box */}
              <div className="bg-indigo-50/30 dark:bg-indigo-950/10 border border-indigo-100/30 rounded-2xl p-3.5">
                <span className="block text-[9px] font-extrabold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mb-1">
                  AI Fit Compatibility Commentary
                </span>
                <p className="text-[10px] text-zinc-600 dark:text-zinc-400 leading-relaxed font-semibold">
                  {pick.commentary}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
