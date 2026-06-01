"use client";

import { useState, useEffect } from "react";
import Sidebar from "./sidebar";
import Topbar from "./topbar";
import LoginPanel from "../auth/login-panel";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Safely initialize state from localStorage on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("sidebar-collapsed");
      if (cached === "true") {
        setIsCollapsed(true);
      }
      
      const token = localStorage.getItem("niveshiq_token");
      setIsAuthenticated(!!token);
    }
  }, []);

  const handleToggleCollapse = () => {
    const nextVal = !isCollapsed;
    setIsCollapsed(nextVal);
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar-collapsed", String(nextVal));
    }
  };

  // Prevent hydration flash of unauthenticated view
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
        <span className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Render Login Panel for unauthenticated sessions
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen w-screen overflow-y-auto bg-zinc-950 flex flex-col items-center py-12 px-4 relative font-sans">
        {/* Sleek Grid Overlay background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#18181b_1px,transparent_1px),linear-gradient(to_bottom,#18181b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-60 pointer-events-none" />
        
        <div className="my-auto w-full flex justify-center z-10 relative">
          <LoginPanel onLoginSuccess={() => setIsAuthenticated(true)} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 dark:bg-zinc-950 font-sans animate-fadeIn">
      {/* Mobile sidebar backdrop overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-zinc-950/60 transition-opacity duration-300 md:hidden"
        />
      )}

      {/* Responsive Collapsible Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-y-auto bg-zinc-50 dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto p-4 sm:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
