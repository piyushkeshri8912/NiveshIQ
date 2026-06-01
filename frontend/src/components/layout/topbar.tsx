"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchProfile } from "@/lib/api";

export default function Topbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const [connectionStatus, setConnectionStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [profileCompleted, setProfileCompleted] = useState<boolean | null>(null);

  const checkProfileStatus = () => {
    fetchProfile()
      .then((profile) => {
        setProfileCompleted(!!profile);
      })
      .catch(() => {
        setProfileCompleted(false);
      });
  };

  useEffect(() => {
    // Check backend API connection
    fetch("/api/health")
      .then((res) => {
        if (!res.ok) throw new Error("API not okay");
        return res.json();
      })
      .then((data) => {
        if (data.database === "connected" || data.status === "healthy") {
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("disconnected");
        }
      })
      .catch(() => {
        setConnectionStatus("disconnected");
      });

    // Check profile onboarding status
    checkProfileStatus();

    // Listen for custom profile update events
    window.addEventListener("profile-updated", checkProfileStatus);
    return () => {
      window.removeEventListener("profile-updated", checkProfileStatus);
    };
  }, []);

  return (
    <header className="h-16 border-b border-zinc-200 bg-white px-4 sm:px-8 flex items-center justify-between dark:bg-zinc-900 dark:border-zinc-800 shrink-0">
      <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
        {/* Mobile Toggle Button */}
        <button
          onClick={onToggleSidebar}
          className="p-1.5 -ml-1 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-xl dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 md:hidden focus:outline-none cursor-pointer shrink-0"
          aria-label="Toggle sidebar"
        >
          <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <h2 className="text-sm md:text-lg font-bold text-zinc-800 dark:text-zinc-100 truncate">
          AI Portfolio review
        </h2>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Onboarding Profile Status Alert */}
        {profileCompleted === false && (
          <Link
            href="/onboarding"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100/50 transition-colors dark:bg-amber-950/20 dark:border-amber-900/40"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold text-amber-800 dark:text-amber-400">
              <span className="hidden sm:inline">Onboarding Incomplete — Setup Profile</span>
              <span className="sm:hidden">Setup Profile</span>
            </span>
          </Link>
        )}

        {profileCompleted === true && (
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/40">
            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
            <span className="text-[10px] sm:text-xs font-semibold text-indigo-700 dark:text-indigo-400">
              <span className="hidden sm:inline">Profile Configured</span>
              <span className="sm:hidden">Profile Ok</span>
            </span>
          </div>
        )}

        {/* Backend Connection Health Badge */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 dark:bg-zinc-800/80 dark:border-zinc-700/80">
          <span
            className={`w-2.5 h-2.5 rounded-full animate-pulse shrink-0 ${
              connectionStatus === "loading"
                ? "bg-amber-500"
                : connectionStatus === "connected"
                ? "bg-emerald-500"
                : "bg-rose-500"
            }`}
          />
          <span className="text-[10px] sm:text-xs font-medium text-zinc-600 dark:text-zinc-300">
            <span className="hidden sm:inline">
              {connectionStatus === "loading"
                ? "Connecting API..."
                : connectionStatus === "connected"
                ? "API Connected"
                : "API Disconnected"}
            </span>
            <span className="sm:hidden">
              {connectionStatus === "loading" ? "Syncing" : connectionStatus === "connected" ? "Live" : "Offline"}
            </span>
          </span>
        </div>
      </div>
    </header>
  );
}
