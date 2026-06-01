"use client";

import { useState, useEffect } from "react";
import { fetchProfile, saveProfile, changePassword, deleteAccount, logout } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Personal Info Form States
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [profession, setProfession] = useState("");

  // Investment Profile Form States
  const [riskAppetite, setRiskAppetite] = useState("MODERATE");
  const [timeHorizon, setTimeHorizon] = useState("MEDIUM_TERM");
  const [investmentGoal, setInvestmentGoal] = useState("BALANCED");
  const [monthlyBudget, setMonthlyBudget] = useState(0);
  const [preferredSectors, setPreferredSectors] = useState("");
  const [avoidSectors, setAvoidSectors] = useState("");

  // Security Form States
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);

  // Delete Account modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    loadProfileData();
  }, []);

  const loadProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProfile();
      if (data) {
        setProfile(data);
        setName(data.full_name || "");
        setDob(data.dob || "");
        setProfession(data.profession || "");
        setRiskAppetite(data.risk_appetite || "MODERATE");
        setTimeHorizon(data.time_horizon || "MEDIUM_TERM");
        setInvestmentGoal(data.investment_goal || "BALANCED");
        setMonthlyBudget(data.monthly_investment_budget || 0);
        setPreferredSectors(data.preferred_sectors?.join(", ") || "");
        setAvoidSectors(data.avoid_sectors?.join(", ") || "");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    // Split sector inputs
    const prefArray = preferredSectors
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");
    const avoidArray = avoidSectors
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "");

    try {
      const updated = await saveProfile({
        full_name: name.trim() || undefined,
        dob: dob || undefined,
        profession: profession || undefined,
        risk_appetite: riskAppetite,
        time_horizon: timeHorizon,
        investment_goal: investmentGoal,
        monthly_investment_budget: Number(monthlyBudget),
        preferred_sectors: prefArray,
        avoid_sectors: avoidArray,
        liquidity_preference: profile?.liquidity_preference || "MEDIUM",
        dividend_vs_growth: profile?.dividend_vs_growth || "BALANCED",
        notes: profile?.notes || "Updated from profile settings page.",
      });
      setProfile(updated);
      setSuccess("Profile settings successfully updated in the database!");
      
      // Dispatch event to refresh Topbar onboarding alert
      window.dispatchEvent(new Event("profile-updated"));
    } catch (err: any) {
      setError(err.message || "Failed to update profile settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityLoading(true);
    setSecurityError(null);
    setSecuritySuccess(null);

    if (newPassword.length < 8) {
      setSecurityError("New password must be at least 8 characters long.");
      setSecurityLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setSecurityError("New passwords do not match.");
      setSecurityLoading(false);
      return;
    }

    try {
      const msg = await changePassword(currentPassword, newPassword);
      setSecuritySuccess(msg);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err: any) {
      setSecurityError(err.message || "Failed to change password.");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE MY ACCOUNT") {
      alert("Please type exactly 'DELETE MY ACCOUNT' to confirm.");
      return;
    }

    setDeleteLoading(true);
    try {
      await deleteAccount();
      logout();
      window.location.reload(); // Drop them back to unauthenticated login screen
    } catch (err: any) {
      alert(err.message || "Failed to delete account.");
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans max-w-5xl mx-auto pb-12 animate-fadeIn">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl">
          User Settings & <span className="bg-gradient-to-r from-indigo-500 to-teal-400 bg-clip-text text-transparent">Profile</span>
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
          Manage your personal identifiers, investment templates, credentials, and account statuses.
        </p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl text-sm font-semibold text-rose-700 dark:text-rose-400">
          ⚠️ {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-2xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 animate-fadeIn">
          ✓ {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Grid: Forms */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Card 1: Personal Details */}
          <div className="bg-white border border-zinc-200 rounded-3xl dark:bg-zinc-900 dark:border-zinc-800 p-6 sm:p-8 shadow-sm">
            <h2 className="text-lg font-extrabold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-2">
              👤 Personal Information
            </h2>
            
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="investor name"
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm font-semibold focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 text-sm font-semibold focus:outline-none focus:border-indigo-500/50 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                  Profession
                </label>
                <select
                  required
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 text-sm font-semibold focus:outline-none focus:border-indigo-500/50 transition-colors cursor-pointer"
                >
                  <option value="Student">Student</option>
                  <option value="Salaried Employee">Salaried Employee</option>
                  <option value="Self-Employed">Self-Employed</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              {/* Card 2: Onboarding Traits inside the save button flow */}
              <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800/80">
                <h3 className="text-md font-extrabold text-zinc-800 dark:text-zinc-200 mb-4 flex items-center gap-2">
                  📈 Investment Constraints
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                      Risk Appetite
                    </label>
                    <select
                      value={riskAppetite}
                      onChange={(e) => setRiskAppetite(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 text-sm font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="CONSERVATIVE">CONSERVATIVE</option>
                      <option value="MODERATE">MODERATE</option>
                      <option value="AGGRESSIVE">AGGRESSIVE</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                      Time Horizon
                    </label>
                    <select
                      value={timeHorizon}
                      onChange={(e) => setTimeHorizon(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 text-sm font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="SHORT_TERM">SHORT TERM</option>
                      <option value="MEDIUM_TERM">MEDIUM TERM</option>
                      <option value="LONG_TERM">LONG TERM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                      Goal
                    </label>
                    <select
                      value={investmentGoal}
                      onChange={(e) => setInvestmentGoal(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 text-sm font-semibold focus:outline-none cursor-pointer"
                    >
                      <option value="WEALTH_ACCUMULATION">WEALTH ACCUMULATION</option>
                      <option value="RETIREMENT">RETIREMENT</option>
                      <option value="INCOME">INCOME</option>
                      <option value="BALANCED">BALANCED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                      Monthly surplus budget (₹)
                    </label>
                    <input
                      type="number"
                      value={monthlyBudget}
                      onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                      placeholder="10000"
                      className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-sm font-semibold focus:outline-none focus:border-indigo-500/50"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                        Preferred Sectors (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={preferredSectors}
                        onChange={(e) => setPreferredSectors(e.target.value)}
                        placeholder="Technology, Healthcare"
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm font-semibold focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                        Avoided Sectors (Comma separated)
                      </label>
                      <input
                        type="text"
                        value={avoidSectors}
                        onChange={(e) => setAvoidSectors(e.target.value)}
                        placeholder="Tobaco, Energy"
                        className="w-full px-4 py-3 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 placeholder-zinc-500 text-sm font-semibold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-sm tracking-wide shadow-md shadow-indigo-600/10 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {saving ? "Saving settings..." : "Save Settings Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Grid: Security Cards */}
        <div className="space-y-8">
          
          {/* Card 3: Security - Change Password */}
          {profile?.hashed_password && (
            <div className="bg-white border border-zinc-200 rounded-3xl dark:bg-zinc-900 dark:border-zinc-800 p-6 shadow-sm">
              <h2 className="text-md font-extrabold text-zinc-800 dark:text-zinc-100 mb-6 flex items-center gap-2">
                🔒 Security Settings
              </h2>

              {securityError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-xs font-semibold text-rose-700 dark:text-rose-400">
                  ⚠️ {securityError}
                </div>
              )}

              {securitySuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  ✓ {securitySuccess}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {showCurrent ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {showNew ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      required
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-2.5 pr-10 rounded-xl border border-zinc-200 bg-zinc-50 text-zinc-800 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 text-sm font-semibold focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                    >
                      {showConfirm ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={securityLoading}
                  className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs uppercase tracking-wide rounded-xl transition-all cursor-pointer"
                >
                  {securityLoading ? "Updating..." : "Update Password"}
                </button>
              </form>
            </div>
          )}

          {/* Card 4: Danger Zone - Delete Account */}
          <div className="bg-white border border-rose-200 rounded-3xl dark:bg-zinc-900 dark:border-rose-950/40 p-6 shadow-sm">
            <h2 className="text-md font-extrabold text-rose-600 dark:text-rose-400 mb-2 flex items-center gap-2">
              🚨 Danger Zone
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 font-medium">
              Actions in this section are permanent and cannot be reversed.
            </p>

            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full py-3 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md shadow-rose-600/10 cursor-pointer flex items-center justify-center gap-2"
            >
              🗑️ Delete My Account
            </button>
          </div>

        </div>

      </div>

      {/* Delete Account Modal Dialog Overlay */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-md p-4 sm:p-6 animate-fadeIn">
          <div className="relative max-w-md w-full p-0.5 rounded-3xl bg-gradient-to-br from-rose-500/30 via-transparent to-zinc-900 shadow-2xl">
            <div className="bg-zinc-950 border border-zinc-900 rounded-[22px] p-6 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 text-2xl mb-4">
                ⚠️
              </div>
              
              <h3 className="text-lg font-black text-zinc-100 leading-tight">
                Delete Account Permanently?
              </h3>
              
              <p className="text-xs text-zinc-400 mt-4 leading-relaxed font-medium">
                This action is **irreversible**. It will immediately cascade and delete all your holdings, watchlist tickers, snapshots, portfolio AI reviews, and login metrics permanently.
              </p>

              <div className="mt-6 text-left space-y-2">
                <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-none ml-1">
                  Type <span className="text-zinc-200">"DELETE MY ACCOUNT"</span> to confirm:
                </label>
                <input
                  type="text"
                  required
                  value={deleteInput}
                  onChange={(e) => setDeleteInput(e.target.value)}
                  placeholder="DELETE MY ACCOUNT"
                  className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-700 text-sm font-semibold focus:outline-none focus:border-rose-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteInput("");
                  }}
                  className="py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading || deleteInput !== "DELETE MY ACCOUNT"}
                  className="py-3 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white rounded-xl font-bold text-xs tracking-wider uppercase transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-rose-600/10"
                >
                  {deleteLoading ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Delete Forever"
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
