"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Engine Overview
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400">
          NiveshIQ Portfolio Review and Scaffolding Control Center.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
              Scaffolding Complete
            </span>
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mt-2">
              Next.js Frontend
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Scaffolded with TS, App Router, and unified dark-themed AppShell.
            </p>
          </div>
          <Link
            href="/portfolio"
            className="mt-6 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
          >
            Visit Portfolio Dashboard
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
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400">
              Phase 0 Installed
            </span>
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mt-2">
              FastAPI Python API
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Operational on Port 8000. Features SQLAlchemy DB context and `/health` ping.
            </p>
          </div>
          <a
            href="/api/health"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1.5"
          >
            Check FastAPI Health API
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
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-zinc-200 shadow-sm dark:bg-zinc-900 dark:border-zinc-800 flex flex-col justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300">
              Local Storage
            </span>
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200 mt-2">
              PostgreSQL DB container
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Configured via Docker-compose for persistence of transactions and user profile state.
            </p>
          </div>
          <span className="mt-6 text-xs text-zinc-400 dark:text-zinc-500 inline-block font-mono">
            PORT: 5432 / DB: niveshiq
          </span>
        </div>
      </div>

      <div className="p-8 rounded-2xl bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-sm">
        <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent">
          Project Implementation Roadmap
        </h3>
        <div className="space-y-6">
          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-emerald-900/30 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold text-sm shrink-0">
              0
            </div>
            <div>
              <h4 className="font-semibold text-zinc-200">Phase 0: Scaffold & Setup (Current)</h4>
              <p className="text-sm text-zinc-400">
                Setup Next.js, FastAPI environment with all dependencies, PostgreSQL database container, and unified layout wrappers.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center font-bold text-sm shrink-0">
              1
            </div>
            <div>
              <h4 className="font-semibold text-zinc-300">Phase 1: User Onboarding</h4>
              <p className="text-sm text-zinc-500">
                Risk appetite profiling, investment styles, avoidance criteria, and preference mapping logic.
              </p>
            </div>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 flex items-center justify-center font-bold text-sm shrink-0">
              2
            </div>
            <div>
              <h4 className="font-semibold text-zinc-300">Phase 2: Holdings & Transactions</h4>
              <p className="text-sm text-zinc-500">
                Weighted average cost derivation, transaction CRUD, and yfinance price data pipelines.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
