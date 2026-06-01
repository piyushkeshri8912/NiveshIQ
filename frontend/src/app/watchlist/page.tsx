"use client";

import { useEffect, useState } from "react";
import { 
  fetchWatchlistPriorities, 
  deleteWatchlistItem, 
  fetchWatchlistAIRecommendations, 
  WatchlistPriorityResponse, 
  WatchlistAIRecommendation 
} from "@/lib/api";
import WatchlistPriorities from "@/components/watchlist/watchlist-priorities";
import WatchlistTable from "@/components/watchlist/watchlist-table";
import AddWatchlistDialog from "@/components/watchlist/add-watchlist-dialog";

export default function WatchlistPage() {
  const [priorities, setPriorities] = useState<WatchlistPriorityResponse[]>([]);
  const [aiRecommendations, setAiRecommendations] = useState<WatchlistAIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);


  const loadWatchlistData = async () => {
    setLoading(true);
    try {
      const data = await fetchWatchlistPriorities();
      setPriorities(data);
    } catch (err) {
      console.error("Failed to load watchlist priorities:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadAIRecommendations = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const recs = await fetchWatchlistAIRecommendations();
      setAiRecommendations(recs);
    } catch (err: any) {
      console.error("Failed to load watchlist AI recommendations:", err);
      setAiError(err.message || "Failed to compile recommendations");
    } finally {
      setAiLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlistData();
  }, []);

  const handleOpenRecommendations = () => {
    setIsSignalsOpen(true);
    loadAIRecommendations();
  };

  const handleDeleteWatchlistItem = async (id: number) => {
    if (confirm("Are you sure you want to remove this stock from your watchlist?")) {
      const success = await deleteWatchlistItem(id);
      if (success) {
        loadWatchlistData();
      } else {
        alert("Failed to remove watchlist item.");
      }
    }
  };

  const handleAddSuccess = () => {
    loadWatchlistData();
  };


  return (
    <div className="space-y-8 animate-fade-in text-left relative min-h-[75vh]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Watchlist Engine
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 font-medium">
            Monitor potential stock picks and analyze their fit against your active sector concentrations and risk appetite.
          </p>
        </div>
        
        <div className="flex shrink-0">
          <button
            onClick={() => setIsDialogOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-md shadow-indigo-600/10 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Ticker
          </button>
        </div>
      </div>

      {/* Main stacked vertical layout */}
      <div className="space-y-8">
        {/* 1. Watchlist Priorities picks Cockpit (Full Width) */}
        {!loading && priorities.length > 0 && (
          <WatchlistPriorities items={priorities} loading={loading} />
        )}

        {/* 2. Watchlist Main Explorer Table (Full Width) */}
        <WatchlistTable
          items={priorities}
          onDelete={handleDeleteWatchlistItem}
          loading={loading}
        />
      </div>

      {/* Watchlist Signals Floating Bubble Button */}
      {!loading && priorities.length > 0 && (
        <button
          onClick={handleOpenRecommendations}
          className="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-4 rounded-full shadow-lg shadow-indigo-600/25 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer border border-indigo-500/20 group animate-bounce"
          title="Open AI Watchlist Analysis"
        >
          {/* Notification Ping Badge */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-50"></span>
          </span>
          
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          
          {/* Hover Slide-out Label */}
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out font-black text-xs whitespace-nowrap pl-0 group-hover:pl-1 tracking-wide uppercase">
            AI Recommendations
          </span>
        </button>
      )}

      {/* Boxed-Style Watchlist AI Recommendations Modal Pop up */}
      {isSignalsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          {/* Boxed style card container */}
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl animate-scale-in text-left flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-zinc-150 dark:border-zinc-800 mb-4 shrink-0">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  AI Watchlist Insights
                </h3>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 font-medium">
                  Dynamic analysis matching market sentiment & risk profile
                </p>
              </div>
              
              <div className="flex items-center gap-1">
                {/* Refresh Trigger */}
                <button
                  onClick={loadAIRecommendations}
                  disabled={aiLoading}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-indigo-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Refresh AI Analysis"
                >
                  <svg
                    className={`w-4 h-4 ${aiLoading ? "animate-spin text-indigo-500" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89l-4.21 4.21"
                    />
                  </svg>
                </button>
                
                {/* Close Button */}
                <button
                  onClick={() => setIsSignalsOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 dark:hover:text-rose-455 transition-colors focus:outline-none cursor-pointer"
                  aria-label="Close pop-up"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable context list */}
            <div className="overflow-y-auto scrollbar-thin pr-1 flex-1 space-y-4">
              {aiLoading ? (
                <div className="space-y-4 py-8">
                  <div className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  <div className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                  <div className="h-24 rounded-2xl bg-zinc-100 dark:bg-zinc-800 animate-pulse" />
                </div>
              ) : aiError ? (
                <div className="p-4 bg-rose-50/20 border border-rose-100 rounded-2xl text-xs font-semibold text-rose-600 text-center dark:bg-rose-950/10 dark:border-rose-900/30">
                  {aiError}
                </div>
              ) : aiRecommendations.length === 0 ? (
                <div className="text-center py-12 text-zinc-400 text-xs">
                  No watchlisted items to analyze. Add tickers to watchlist.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* SEBI Compliance alert */}
                  <div className="p-3 bg-amber-50/30 border border-amber-200 dark:bg-amber-950/10 dark:border-amber-900/20 rounded-xl text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    Educational analysis: Not SEBI registered financial advice. All investments carry risk.
                  </div>

                  {aiRecommendations.map((rec) => {
                    const getCompBadge = (comp: string) => {
                      if (comp === "EXCELLENT") return "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400";
                      if (comp === "GOOD") return "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400";
                      if (comp === "NEUTRAL") return "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400";
                      return "bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-950/30 dark:text-rose-455";
                    };
                    return (
                      <div 
                        key={rec.symbol}
                        className="p-4 border border-zinc-150 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/10 rounded-2xl space-y-2 text-left"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-sm text-zinc-900 dark:text-zinc-50">
                            {rec.symbol}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black border ${getCompBadge(rec.compatibility)}`}>
                            {rec.compatibility} FIT
                          </span>
                        </div>
                        <p className="text-xs text-zinc-650 dark:text-zinc-400 leading-relaxed font-semibold">
                          {rec.recommendation}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* Add Stock modal Dialog */}
      <AddWatchlistDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleAddSuccess}
      />
    </div>
  );
}
