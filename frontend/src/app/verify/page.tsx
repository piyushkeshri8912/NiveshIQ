"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { verifyEmail, saveProfile } from "@/lib/api";

function VerifyContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Mandatory Onboarding form fields
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [profession, setProfession] = useState("");
  const [saving, setSaving] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Missing activation token in the link.");
      setVerifying(false);
      return;
    }

    verifyEmail(token)
      .then(() => {
        setSuccess(true);
        setVerifying(false);
      })
      .catch((err) => {
        setError(err.message || "Email verification failed. The link may have expired.");
        setVerifying(false);
      });
  }, [token]);

  const handleOnboardingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob || !profession) {
      setError("All fields are mandatory.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Save details to profile inside PostgreSQL
      await saveProfile({
        full_name: name.trim(),
        dob: dob,
        profession: profession,
        risk_appetite: "MODERATE", // Default onboarding values
        time_horizon: "MEDIUM_TERM",
        investment_goal: "BALANCED",
        preferred_sectors: [],
        avoid_sectors: [],
        liquidity_preference: "MEDIUM",
        dividend_vs_growth: "BALANCED",
        monthly_investment_budget: 0,
        notes: "Account created via verification onboarding.",
      });

      // Show welcome overlay popup
      setShowWelcome(true);
    } catch (err: any) {
      setError(err.message || "Failed to save details. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleProceed = () => {
    // Notify application shell of successful login
    window.location.href = "/portfolio"; // Forces fresh shell reload with token active
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 relative font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-zinc-200">Verifying your email...</h2>
        <p className="text-sm text-zinc-500 mt-1">Please wait while NiveshIQ activates your account.</p>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 relative font-sans">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30 pointer-events-none" />
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <div className="text-4xl mb-4 text-zinc-500">⚠️</div>
          <h2 className="text-xl font-bold text-zinc-200">Verification Failed</h2>
          <p className="text-sm text-zinc-400 mt-2">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-2xl font-bold text-sm tracking-wide transition-all cursor-pointer"
          >
            Go back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40 pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Mandatory Onboarding Card */}
      <div className="relative z-10 max-w-md w-full p-0.5 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-transparent to-teal-500/20 shadow-2xl backdrop-blur-xl">
        <div className="bg-zinc-950/95 border border-zinc-900 rounded-[22px] p-6 sm:p-8">
          
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black text-xl tracking-wider mb-3">
              N
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
              Activate your <span className="bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">Profile</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-medium">
              We just need a few basic details to configure your buddy.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs font-semibold text-rose-400">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleOnboardingSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Piyush Sharma"
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Profession <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
              >
                <option value="" disabled>Select your profession</option>
                <option value="Student">Student</option>
                <option value="Salaried Employee">Salaried Employee</option>
                <option value="Self-Employed">Self-Employed</option>
                <option value="Others">Others</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/10 active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-6"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Save & Continue"
              )}
            </button>
          </form>

        </div>
      </div>

      {/* Welcome Dialogue Popup Overlay */}
      {showWelcome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 sm:p-6 font-sans">
          <div className="relative max-w-sm w-full p-0.5 rounded-3xl bg-gradient-to-br from-indigo-500/30 via-transparent to-teal-500/30 shadow-2xl">
            <div className="bg-zinc-950 border border-zinc-900 rounded-[22px] p-6 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-indigo-600 to-teal-500 text-white text-3xl mb-4 shadow-lg shadow-indigo-600/20">
                🎉
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight leading-tight">
                Profile Activated!
              </h2>
              <p className="text-sm text-zinc-300 mt-4 leading-relaxed font-medium">
                "Welcome to NiveshIQ, Your personal buddy to help you in your investing journey"
              </p>
              
              <button
                onClick={handleProceed}
                className="mt-6 w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-wider uppercase rounded-2xl shadow-lg shadow-indigo-600/10 cursor-pointer transition-all active:scale-98"
              >
                Let's Get Started
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center text-center p-6 relative">
        <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <VerifyContent />
    </Suspense>
  );
}
