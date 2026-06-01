"use client";

import { useState, useEffect } from "react";
import { loginUser, registerUser, forgotPassword, loginWithGoogle } from "@/lib/api";

interface LoginPanelProps {
  onLoginSuccess: () => void;
}

export default function LoginPanel({ onLoginSuccess }: LoginPanelProps) {
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // Dynamic Google script loading & standard button rendering
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const google = (window as any).google;
      if (google) {
        google.accounts.id.initialize({
          client_id: "378042793272-gqu1lil8gans5r9d9qnp5pjh7ia7inr6.apps.googleusercontent.com",
          callback: async (response: any) => {
            setLoading(true);
            setError(null);
            setInfoMessage(null);
            try {
              await loginWithGoogle(response.credential);
              onLoginSuccess();
            } catch (err: any) {
              setError(err.message || "Google Sign-In failed.");
            } finally {
              setLoading(false);
            }
          },
        });

        const btnDiv = document.getElementById("googleBtn");
        if (btnDiv) {
          google.accounts.id.renderButton(btnDiv, {
            theme: "filled_black",
            size: "large",
            width: "380",
            shape: "pill",
            text: "signup_with",
          });
        }
      }
    };

    return () => {
      try {
        document.body.removeChild(script);
      } catch (e) {}
    };
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfoMessage(null);

    // Frontend validations
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (mode === "register") {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        setLoading(false);
        return;
      }
    }

    try {
      if (mode === "register") {
        const res = await registerUser(email, password);
        setInfoMessage(res.message);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
      } else if (mode === "login") {
        await loginUser(email, password);
        onLoginSuccess();
      } else {
        // Forgot password flow
        const msg = await forgotPassword(email);
        setInfoMessage(msg);
        setEmail("");
      }
    } catch (err: any) {
      setError(err.message || "Request failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    setInfoMessage(null);
    try {
      await loginUser("demo@niveshiq.com", "DemoPassword123");
      onLoginSuccess();
    } catch (err: any) {
      setError("Demo access failed. Check if server is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-md p-0.5 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-transparent to-teal-500/20 shadow-2xl backdrop-blur-xl shrink-0 overflow-hidden font-sans">
      <div className="bg-zinc-950/90 border border-zinc-900 rounded-[22px] p-6 sm:p-8 relative z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 font-black text-xl tracking-wider mb-3">
            N
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-100 tracking-tight">
            Nivesh<span className="bg-gradient-to-r from-indigo-400 to-teal-400 bg-clip-text text-transparent">IQ</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-medium">
            AI-Driven Portfolio Intelligence Engine
          </p>
        </div>

        {/* Display Message Alerts */}
        {error && (
          <div className="mb-4 p-3.5 rounded-xl bg-rose-950/20 border border-rose-900/40 text-xs font-semibold text-rose-400 animate-fadeIn">
            ⚠️ {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-4 p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-900/40 text-xs font-semibold text-indigo-300 animate-fadeIn">
            ℹ️ {infoMessage}
          </div>
        )}

        {/* Dynamic Mode Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="investor@example.com"
              className="w-full px-4 py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5 ml-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-600 text-sm font-medium focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 focus:outline-none cursor-pointer"
                >
                  {showConfirmPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {mode === "login" && (
            <div className="flex justify-end pr-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError(null);
                  setInfoMessage(null);
                }}
                className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/40 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-98 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-6"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : mode === "register" ? (
              "Register Account"
            ) : mode === "forgot" ? (
              "Send Reset Link"
            ) : (
              "Secure Log In"
            )}
          </button>
        </form>

        <div className="relative my-6 shrink-0">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-zinc-800/80" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
            <span className="bg-zinc-950 px-3.5 text-zinc-500">Fast Track Options</span>
          </div>
        </div>

        {/* Dynamic render Google button/Demo Signin */}
        <div className="flex flex-col gap-3 items-center justify-center w-full">
          {/* Google SSO Container */}
          <div id="googleBtn" className="w-full flex justify-center overflow-hidden h-[44px] rounded-full shrink-0 relative" />

          {/* Quick Demo Access */}
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full py-3 rounded-full border border-zinc-800 hover:border-zinc-700 bg-zinc-900/30 hover:bg-zinc-900/60 disabled:opacity-50 text-indigo-400 font-bold text-xs tracking-wider uppercase transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer h-[44px]"
          >
            {loading ? (
              <span className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>⚡</span> Demo Quick Access
              </>
            )}
          </button>
        </div>

        {/* Alternate Toggles */}
        <div className="text-center mt-6">
          {mode === "forgot" ? (
            <button
              onClick={() => {
                setMode("login");
                setError(null);
                setInfoMessage(null);
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline hover:no-underline"
            >
              Back to Login
            </button>
          ) : (
            <p className="text-xs text-zinc-400 font-medium">
              {mode === "register" ? "Already have an account?" : "New to NiveshIQ?"}{" "}
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "register" ? "login" : "register");
                  setError(null);
                  setInfoMessage(null);
                  setPassword("");
                  setConfirmPassword("");
                }}
                className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer underline hover:no-underline ml-1"
              >
                {mode === "register" ? "Log In here" : "Sign Up here"}
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  );
}
