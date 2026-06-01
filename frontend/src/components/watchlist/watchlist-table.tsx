"use client";

import { WatchlistPriorityResponse } from "@/lib/api";

interface WatchlistTableProps {
  items: WatchlistPriorityResponse[];
  onDelete: (id: number) => Promise<void>;
  loading: boolean;
}

export default function WatchlistTable({
  items,
  onDelete,
  loading,
}: WatchlistTableProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden animate-pulse">
        <div className="h-6 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg mb-6"></div>
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="grid grid-cols-6 gap-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded col-span-1"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded col-span-2"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded col-span-1"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded col-span-1"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded col-span-1"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 shadow-sm text-center">
        <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-indigo-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50 mb-1">
          No candidates in watchlist
        </h4>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mb-6">
          Add stocks you are watching to compute how they fit your active portfolio diversification and risk appetite.
        </p>
      </div>
    );
  }

  const getCompatibilityBadge = (comp: string) => {
    switch (comp) {
      case "EXCELLENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            EXCELLENT
          </span>
        );
      case "GOOD":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            GOOD
          </span>
        );
      case "NEUTRAL":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            NEUTRAL
          </span>
        );
      case "AVOID":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            AVOID FIT
          </span>
        );
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
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
          Watchlist Explorer ({items.length})
        </h3>
      </div>
      
      {/* Table view for Desktop, scrollable for mobile */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-50/50 dark:bg-zinc-950/30">
              <th className="px-6 py-4">Symbol</th>
              <th className="px-6 py-4">Live Price</th>
              <th className="px-6 py-4">Sector / Bucket</th>
              <th className="px-6 py-4">Fit Score</th>
              <th className="px-6 py-4">Compatibility</th>
              <th className="px-6 py-4">Watch Reason / Insight</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {items.map((item) => (
              <tr
                key={item.id}
                className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition-all"
              >
                {/* Symbol & Company */}
                <td className="px-6 py-4.5">
                  <div>
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {item.symbol}
                    </span>
                    <span className="block text-[11px] font-medium text-zinc-400 dark:text-zinc-500 max-w-[180px] truncate">
                      {item.company_name || item.symbol}
                    </span>
                  </div>
                </td>
                
                {/* Live Price */}
                <td className="px-6 py-4.5 font-semibold text-sm text-zinc-800 dark:text-zinc-200">
                  {formatPrice(item.market_price, item.symbol)}
                </td>
                
                {/* Sector & Market Cap Bucket */}
                <td className="px-6 py-4.5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                      {item.sector || "Other"}
                    </span>
                    {item.market_cap_bucket && (
                      <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50/50 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-300">
                        {item.market_cap_bucket}
                      </span>
                    )}
                  </div>
                </td>
                
                {/* Fit Score */}
                <td className="px-6 py-4.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-extrabold ${
                      item.fit_score >= 8.0
                        ? "text-emerald-500 dark:text-emerald-400"
                        : item.fit_score >= 6.0
                        ? "text-indigo-500 dark:text-indigo-400"
                        : item.fit_score >= 4.0
                        ? "text-amber-500 dark:text-amber-400"
                        : "text-rose-500 dark:text-rose-400"
                    }`}>
                      {item.fit_score.toFixed(1)}
                    </span>
                    <div className="w-12 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.fit_score >= 8.0
                            ? "bg-emerald-500"
                            : item.fit_score >= 6.0
                            ? "bg-indigo-500"
                            : item.fit_score >= 4.0
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                        style={{ width: `${item.fit_score * 10}%` }}
                      ></div>
                    </div>
                  </div>
                </td>
                
                {/* Compatibility */}
                <td className="px-6 py-4.5">
                  {getCompatibilityBadge(item.compatibility)}
                </td>
                
                {/* Watch Reason & Dynamic Commentary */}
                <td className="px-6 py-4.5 max-w-[280px]">
                  <div className="space-y-1">
                    {item.watch_reason && (
                      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 italic">
                        "{item.watch_reason}"
                      </p>
                    )}
                    <p className="text-[11px] text-zinc-400 dark:text-zinc-500 leading-relaxed font-medium">
                      {item.commentary}
                    </p>
                  </div>
                </td>
                
                {/* Delete action */}
                <td className="px-6 py-4.5 text-right">
                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 transition-all opacity-80 group-hover:opacity-100"
                    title="Remove from Watchlist"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
