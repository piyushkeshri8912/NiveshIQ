"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchProfile, saveProfile, UserProfile } from "@/lib/api";

const SECTORS_LIST = [
  "Technology",
  "Healthcare",
  "Financials",
  "Consumer Discretionary",
  "Industrials",
  "Energy",
  "Utilities",
  "Real Estate",
  "Materials",
  "Communication Services",
];

export default function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [riskAppetite, setRiskAppetite] = useState("MODERATE");
  const [timeHorizon, setTimeHorizon] = useState("MEDIUM_TERM");
  const [investmentGoal, setInvestmentGoal] = useState("WEALTH_ACCUMULATION");
  const [preferredSectors, setPreferredSectors] = useState<string[]>([]);
  const [avoidSectors, setAvoidSectors] = useState<string[]>([]);
  const [liquidityPreference, setLiquidityPreference] = useState("MEDIUM");
  const [dividendVsGrowth, setDividendVsGrowth] = useState("BALANCED");
  const [monthlyInvestmentBudget, setMonthlyInvestmentBudget] = useState(10000);
  const [notes, setNotes] = useState("");

  // Load existing profile if it exists
  useEffect(() => {
    fetchProfile()
      .then((profile) => {
        if (profile) {
          setRiskAppetite(profile.risk_appetite);
          setTimeHorizon(profile.time_horizon);
          setInvestmentGoal(profile.investment_goal);
          setPreferredSectors(profile.preferred_sectors || []);
          setAvoidSectors(profile.avoid_sectors || []);
          setLiquidityPreference(profile.liquidity_preference || "MEDIUM");
          setDividendVsGrowth(profile.dividend_vs_growth || "BALANCED");
          setMonthlyInvestmentBudget(profile.monthly_investment_budget || 10000);
          setNotes(profile.notes || "");
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleNext = () => {
    setStep((prev) => Math.min(prev + 1, 3));
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSectorToggle = (sector: string, type: "preferred" | "avoid") => {
    if (type === "preferred") {
      setPreferredSectors((prev) => {
        if (prev.includes(sector)) return prev.filter((s) => s !== sector);
        // Avoid sector can't be preferred at the same time
        setAvoidSectors((a) => a.filter((s) => s !== sector));
        return [...prev, sector];
      });
    } else {
      setAvoidSectors((prev) => {
        if (prev.includes(sector)) return prev.filter((s) => s !== sector);
        // Preferred sector can't be avoided at the same time
        setPreferredSectors((p) => p.filter((s) => s !== sector));
        return [...prev, sector];
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const payload: UserProfile = {
      risk_appetite: riskAppetite,
      time_horizon: timeHorizon,
      investment_goal: investmentGoal,
      preferred_sectors: preferredSectors,
      avoid_sectors: avoidSectors,
      liquidity_preference: liquidityPreference,
      dividend_vs_growth: dividendVsGrowth,
      monthly_investment_budget: Number(monthlyInvestmentBudget),
      notes: notes,
    };

    try {
      await saveProfile(payload);
      setSuccess(true);
      // Automatically refresh indicators in other client contexts
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      setErrorMessage(err.message || "Something went wrong while saving profile.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-600"></div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-2xl mx-auto text-center space-y-8 py-16 animate-fade-in">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto text-4xl shadow-lg shadow-emerald-500/10">
          ✓
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Profile Saved Successfully!
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
            Your investment appetite, constraints, and goal parameters have been stored. NiveshIQ is now grounded in your personal context.
          </p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-6 dark:bg-zinc-900/40 dark:border-zinc-800 text-left max-w-md mx-auto space-y-3 text-sm">
          <p className="font-semibold text-zinc-800 dark:text-zinc-200">Seeded Configuration Summary:</p>
          <div className="grid grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-400">
            <span>Risk Profile:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{riskAppetite}</span>
            <span>Horizon:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{timeHorizon.replace("_", " ")}</span>
            <span>Goal Style:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{investmentGoal.replace("_", " ")}</span>
            <span>Monthly Budget:</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200">₹{monthlyInvestmentBudget.toLocaleString()}</span>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <button
            onClick={() => {
              setSuccess(false);
              setStep(1);
            }}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 text-sm font-medium hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900 transition-colors"
          >
            Update Profile
          </button>
          <Link
            href="/portfolio"
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-colors"
          >
            Go to Portfolio Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header & Steps progress indicator */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Investor Profiling
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Customize NiveshIQ explaining parameters to your risk profile.
            </p>
          </div>
          <span className="text-sm font-medium text-zinc-400 font-mono">
            STEP {step} / 3
          </span>
        </div>

        {/* Multi-step progress bar */}
        <div className="h-1.5 w-full bg-zinc-200 rounded-full dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-3xl p-8 dark:bg-zinc-900 dark:border-zinc-800 space-y-8 shadow-sm">
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-2xl dark:bg-rose-950/20 dark:border-rose-900/40 dark:text-rose-400">
            {errorMessage}
          </div>
        )}

        {/* STEP 1: Risk Appetite & Horizon */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Risk Appetite
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: "CONSERVATIVE",
                    label: "Conservative",
                    desc: "Focus on capital preservation and steady dividend yields.",
                  },
                  {
                    value: "MODERATE",
                    label: "Moderate",
                    desc: "Balances growth potential with moderate drawdowns.",
                  },
                  {
                    value: "AGGRESSIVE",
                    label: "Aggressive",
                    desc: "Maximize long-term return potential with high volatility.",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRiskAppetite(item.value)}
                    className={`p-4 rounded-2xl text-left border flex flex-col justify-between h-36 transition-all duration-200 ${
                      riskAppetite === item.value
                        ? "border-indigo-600 bg-indigo-50/20 dark:border-indigo-500 dark:bg-indigo-950/10 shadow-sm"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100">
                      {item.label}
                    </span>
                    <span className="text-xs text-zinc-400 leading-normal">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Investment Time Horizon
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    value: "SHORT_TERM",
                    label: "Short Term",
                    desc: "1 to 3 Years",
                  },
                  {
                    value: "MEDIUM_TERM",
                    label: "Medium Term",
                    desc: "3 to 7 Years",
                  },
                  {
                    value: "LONG_TERM",
                    label: "Long Term",
                    desc: "7+ Years",
                  },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setTimeHorizon(item.value)}
                    className={`p-4 rounded-2xl border text-center transition-all duration-200 ${
                      timeHorizon === item.value
                        ? "border-indigo-600 bg-indigo-50/20 dark:border-indigo-500 dark:bg-indigo-950/10"
                        : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
                    }`}
                  >
                    <span className="font-semibold text-zinc-800 dark:text-zinc-100 block">
                      {item.label}
                    </span>
                    <span className="text-xs text-zinc-400 mt-1 block">
                      {item.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Goals, Style, Budget */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Primary Investment Goal
                </label>
                <select
                  value={investmentGoal}
                  onChange={(e) => setInvestmentGoal(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="WEALTH_ACCUMULATION">Wealth Accumulation</option>
                  <option value="RETIREMENT">Retirement Planning</option>
                  <option value="INCOME">Regular Income</option>
                  <option value="BALANCED">Balanced Allocation</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Allocation Style
                </label>
                <select
                  value={dividendVsGrowth}
                  onChange={(e) => setDividendVsGrowth(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="GROWTH">Growth Focused</option>
                  <option value="DIVIDEND">Dividend & Income</option>
                  <option value="BALANCED">Balanced Mix</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Liquidity Needs
                </label>
                <select
                  value={liquidityPreference}
                  onChange={(e) => setLiquidityPreference(e.target.value)}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                >
                  <option value="HIGH">High (Cash/Short Duration)</option>
                  <option value="MEDIUM">Medium (Balanced)</option>
                  <option value="LOW">Low (Longer Lock-up Allowed)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Monthly Surplus Budget (₹)
                </label>
                <input
                  type="number"
                  value={monthlyInvestmentBudget}
                  onChange={(e) => setMonthlyInvestmentBudget(Number(e.target.value))}
                  placeholder="e.g. 10000"
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Sector Filters & Notes */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Preferred Sectors (Will guide overweight warnings)
              </label>
              <div className="flex flex-wrap gap-2">
                {SECTORS_LIST.map((sector) => {
                  const isPreferred = preferredSectors.includes(sector);
                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => handleSectorToggle(sector, "preferred")}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                        isPreferred
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700"
                      }`}
                    >
                      {sector}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                Avoid Sectors (Filters / generates strict flags)
              </label>
              <div className="flex flex-wrap gap-2">
                {SECTORS_LIST.map((sector) => {
                  const isAvoided = avoidSectors.includes(sector);
                  return (
                    <button
                      key={sector}
                      type="button"
                      onClick={() => handleSectorToggle(sector, "avoid")}
                      className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all duration-200 ${
                        isAvoided
                          ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                          : "border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:border-zinc-700"
                      }`}
                    >
                      {sector}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                General Profile Notes & Custom Rules
              </label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Include customized investment parameters or rules (e.g. 'Never invest more than 15% in a single company.')"
                className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm resize-none"
              />
            </div>
          </div>
        )}

        {/* Button Actions */}
        <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-6">
          <button
            type="button"
            onClick={handlePrev}
            disabled={step === 1}
            className={`px-4 py-2.5 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors ${
              step === 1 ? "opacity-40 cursor-not-allowed" : ""
            }`}
          >
            Back
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-medium hover:bg-emerald-700 shadow-md shadow-emerald-600/10 transition-colors disabled:opacity-50"
            >
              {submitting ? "Saving Profile..." : "Complete Profile"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}