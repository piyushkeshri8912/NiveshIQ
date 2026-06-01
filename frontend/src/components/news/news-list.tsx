"use client";

import { NewsItemResponse } from "@/lib/api";

interface NewsListProps {
  items: NewsItemResponse[];
  loading: boolean;
  filterSymbol?: string | null;
}

export default function NewsList({
  items,
  loading,
  filterSymbol = null,
}: NewsListProps) {
  
  // Filter news by symbol if requested (e.g., in watchlist sidebar)
  const filtered = filterSymbol
    ? items.filter((item) => item.symbol.toUpperCase() === filterSymbol.toUpperCase())
    : items;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-5 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm animate-pulse space-y-3"
          >
            <div className="flex justify-between items-center">
              <div className="h-5 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-full"></div>
              <div className="h-3.5 w-24 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            </div>
            <div className="h-5 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-4 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded"></div>
            <div className="h-10 bg-zinc-150 dark:bg-zinc-850 rounded-2xl"></div>
          </div>
        ))}
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="p-8 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-3xl text-center space-y-3">
        <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-850 rounded-2xl flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-500">
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 4a2 2 0 00-2-2m-2 3h2a2 2 0 002-2V8a2 2 0 00-2-2h-2m-9 0h4m-4 4h4m-4 4h1"
            />
          </svg>
        </div>
        <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
          No relevant news feed found
        </h4>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
          Add assets to your holdings or watchlist. Real-time news aggregation triggers automatically based on your customized assets.
        </p>
      </div>
    );
  }

  const formatPublishDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="space-y-4">
      {filtered.map((item, index) => (
        <div
          key={`${item.symbol}-${index}`}
          className="p-5 sm:p-6 border border-zinc-200 dark:border-zinc-800 rounded-3xl bg-white dark:bg-zinc-900 shadow-sm transition-all duration-300 hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700 flex flex-col justify-between gap-4 text-left"
        >
          {/* Card Top Row: Symbol tag, Publisher, Time */}
          <div className="flex flex-wrap justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-100/30">
                {item.symbol}
              </span>
              <span className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 truncate max-w-[140px]">
                {item.company_name}
              </span>
            </div>
            
            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold text-zinc-400 dark:text-zinc-500">
              <span className="font-bold text-zinc-500 dark:text-zinc-400">{item.source}</span>
              <span>•</span>
              <span className="font-mono">{formatPublishDate(item.published_at)}</span>
            </div>
          </div>

          {/* Title / Headline Link */}
          <div className="space-y-1">
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group block text-sm sm:text-base font-extrabold text-zinc-900 dark:text-zinc-50 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors leading-snug cursor-pointer"
            >
              {item.title}
              <svg
                className="inline-block w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-all translate-y-[-2px] group-hover:translate-x-[2px]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* Dynamic commentary bubble: Why this matters to user's portfolio */}
          <div className="bg-zinc-50/50 dark:bg-zinc-950/20 border border-zinc-150/40 dark:border-zinc-850/50 rounded-2xl p-3.5">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
              <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-wider">
                Why this matters to your portfolio
              </span>
            </div>
            <p className="text-[10px] sm:text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-semibold">
              {item.why_matters}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
