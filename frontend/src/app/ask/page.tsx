"use client";

import { useState } from "react";
import { askCopilot, AskResponse } from "@/lib/api";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  payload?: AskResponse;
  timestamp: Date;
}

export default function AskPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const starterPrompts = [
    { text: "Am I too concentrated?", label: "Concentration Check" },
    { text: "What should I do with ₹10,000 this month?", label: "Investment Strategy" },
    { text: "Which watchlist stock fits my profile best?", label: "Watchlist Match" },
    { text: "What is my biggest risk right now?", label: "Risk Exposure" },
  ];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    setLoading(true);
    setError(null);

    const userMsgId = `user-${Date.now()}`;
    const newUserMessage: Message = {
      id: userMsgId,
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setQuery("");

    try {
      const data = await askCopilot(textToSend);
      
      const copilotMsgId = `copilot-${Date.now()}`;
      const newCopilotMessage: Message = {
        id: copilotMsgId,
        sender: "copilot",
        text: data.answer,
        payload: data,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, newCopilotMessage]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to retrieve copilot recommendations. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 via-violet-500 to-pink-500 bg-clip-text text-transparent dark:from-indigo-400 dark:via-violet-300 dark:to-pink-300">
          NiveshIQ Copilot
        </h1>
        <p className="text-zinc-500 dark:text-zinc-400 text-sm">
          Grounded conversational assistant answering queries backed by your real-time portfolio analytics.
        </p>
      </div>

      {/* Main chat window container */}
      <div className="bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-150 dark:border-zinc-800 rounded-3xl p-6 shadow-xl shadow-zinc-100/50 dark:shadow-none min-h-[500px] flex flex-col justify-between">
        {/* Conversations History */}
        <div className="flex-1 space-y-6 mb-6 overflow-y-auto max-h-[550px] pr-2">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-16 space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center animate-pulse shadow-md shadow-indigo-100 dark:shadow-none">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 tracking-tight">
                Ask your Portfolio Copilot
              </h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm">
                Get compliance-friendly, evidence-backed advice about allocations, watchlist matches, and rebalancing ideas.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"} animate-fadeIn`}>
                <div className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                  msg.sender === "user" 
                    ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none shadow-md shadow-indigo-150"
                    : "bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-none shadow-sm"
                }`}>
                  {msg.sender === "user" ? (
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Main Answer */}
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>

                      {/* Evidence, caveats, next steps structured layout */}
                      {msg.payload && (
                        <div className="space-y-4 pt-3 border-t border-zinc-150 dark:border-zinc-800">
                          {/* Evidence Pill badgets */}
                          {msg.payload.evidence && msg.payload.evidence.length > 0 && (
                            <div className="space-y-2">
                              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
                                Contextual Evidence
                              </span>
                              <div className="flex flex-wrap gap-2">
                                {msg.payload.evidence.map((ev, index) => (
                                  <span key={index} className="inline-flex items-center gap-1 text-xs bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full border border-indigo-100/50 dark:border-none font-semibold">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4" />
                                    </svg>
                                    {ev}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Next steps action checklist */}
                          {msg.payload.next_steps && msg.payload.next_steps.length > 0 && (
                            <div className="space-y-2 bg-zinc-100/50 dark:bg-zinc-900/40 p-3 rounded-2xl border border-zinc-150 dark:border-zinc-800/80">
                              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block mb-1">
                                Recommended Actions
                              </span>
                              <div className="space-y-1.5">
                                {msg.payload.next_steps.map((step, index) => (
                                  <div key={index} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                                    <div className="w-4 h-4 rounded bg-violet-100 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold mt-0.5 scale-90">
                                      {index + 1}
                                    </div>
                                    <span className="leading-normal font-medium">{step}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Regulatory Caveat Notice */}
                          {msg.payload.caveat && (
                            <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl p-3 flex gap-2.5">
                              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="space-y-0.5">
                                <span className="text-xs font-bold text-amber-800 dark:text-amber-400 block tracking-tight">
                                  Compliance Disclosure
                                </span>
                                <span className="text-[11px] text-amber-700/90 dark:text-amber-500/80 leading-normal font-medium block">
                                  {msg.payload.caveat}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Typing Loading Skeleton */}
          {loading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 text-zinc-500 rounded-3xl rounded-tl-none px-5 py-4 flex items-center space-x-2">
                <span className="text-xs font-bold tracking-tight animate-pulse text-indigo-500">
                  Thinking
                </span>
                <span className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-150"></span>
                  <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-300"></span>
                </span>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 p-4 rounded-2xl flex items-center gap-3">
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold">{error}</span>
            </div>
          )}
        </div>

        {/* Input box and quick starter bubble triggers */}
        <div className="space-y-4 border-t border-zinc-150 dark:border-zinc-800/80 pt-4">
          {/* Quick starter prompts */}
          {messages.length === 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest block pl-1">
                Suggested Prompts
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {starterPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(prompt.text)}
                    disabled={loading}
                    className="flex items-center justify-between text-left p-3.5 rounded-2xl bg-zinc-50 hover:bg-indigo-50/40 dark:bg-zinc-800/40 dark:hover:bg-zinc-800/90 border border-zinc-100 hover:border-indigo-100 dark:border-zinc-800/80 text-zinc-700 hover:text-indigo-600 dark:text-zinc-300 dark:hover:text-indigo-400 transition-all duration-200 active:scale-98"
                  >
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                        {prompt.label}
                      </span>
                      <span className="text-xs font-bold block leading-snug">
                        {prompt.text}
                      </span>
                    </div>
                    <svg className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500 shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form Q&A Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about sector overexposure, watchlist compatibility, rebalancing ₹10,000..."
              disabled={loading}
              className="flex-1 bg-zinc-50 dark:bg-zinc-800/30 hover:bg-zinc-100/50 focus:bg-white dark:hover:bg-zinc-800/50 dark:focus:bg-zinc-900 border border-zinc-200 focus:border-indigo-500 dark:border-zinc-800 dark:focus:border-indigo-500 rounded-2xl px-4 py-3.5 text-sm text-zinc-800 dark:text-zinc-200 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all duration-200"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white disabled:bg-zinc-100 disabled:text-zinc-400 dark:disabled:bg-zinc-800/80 dark:disabled:text-zinc-600 px-5 py-3.5 rounded-2xl font-bold text-sm shadow-md shadow-indigo-100 hover:shadow-indigo-200 dark:shadow-none transition-all duration-200 active:scale-98 shrink-0 flex items-center gap-1.5"
            >
              <span>Ask</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
