"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ 
  isOpen, 
  onClose,
  isCollapsed,
  onToggleCollapse
}: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    {
      name: "Portfolio",
      path: "/portfolio",
      icon: (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      name: "Watchlist",
      path: "/watchlist",
      icon: (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      ),
    },
    {
      name: "Ask AI",
      path: "/ask",
      icon: (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
          />
        </svg>
      ),
    },
    {
      name: "Risk Profile",
      path: "/onboarding",
      icon: (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
    {
      name: "Profile",
      path: "/profile",
      icon: (
        <svg
          className="w-5 h-5 shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 bg-zinc-950 text-zinc-100 flex flex-col border-r border-zinc-800 transform md:translate-x-0 md:static md:h-auto transition-all duration-300 ease-in-out ${
      isCollapsed ? "md:w-[72px]" : "md:w-64"
    } ${isOpen ? "translate-x-0 w-64" : "-translate-x-full w-64"}`}>
      
      {/* Sidebar Header */}
      <div className={`h-16 flex items-center justify-between border-b border-zinc-800 ${
        isCollapsed ? "md:px-3 md:justify-center" : "px-6"
      }`}>
        
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 shrink-0" onClick={onClose}>
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-lg tracking-wider shadow-md shadow-indigo-500/20 shrink-0">
            N
          </div>
          <span className={`font-semibold text-lg tracking-tight bg-gradient-to-r from-zinc-50 to-zinc-400 bg-clip-text text-transparent transition-all duration-300 ${
            isCollapsed ? "md:hidden" : ""
          }`}>
            NiveshIQ
          </span>
        </Link>

        {/* Desktop Collapse Arrow Button */}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 focus:outline-none cursor-pointer shrink-0 transition-transform duration-300"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            /* Expand chevron right arrow (>>) */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          ) : (
            /* Collapse chevron left arrow (<<) */
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 md:hidden focus:outline-none cursor-pointer"
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation list */}
      <nav className={`flex-1 py-6 space-y-1.5 ${
        isCollapsed ? "md:px-2" : "px-4"
      }`}>
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.name}
              href={item.path}
              onClick={onClose}
              title={isCollapsed ? item.name : undefined}
              className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 group ${
                isCollapsed 
                  ? "md:justify-center md:px-0 md:py-3.5" 
                  : "gap-3 px-4 py-3"
              } ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              }`}
            >
              <div
                className={`transition-transform duration-200 group-hover:scale-110 shrink-0 ${
                  isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                }`}
              >
                {item.icon}
              </div>
              <span className={`transition-all duration-300 ${
                isCollapsed ? "md:hidden" : ""
              }`}>
                {item.name}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer User welcome Box */}
      <div className={`border-t border-zinc-800 ${
        isCollapsed ? "md:p-2" : "p-4"
      }`}>
        <div className={`bg-zinc-900/50 border border-zinc-800/80 rounded-2xl transition-all duration-300 ${
          isCollapsed ? "md:p-1.5 md:flex md:justify-center" : "p-4"
        }`}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-200 shrink-0 shadow-sm border border-zinc-800/40">
                U
              </div>
              <div className={`transition-all duration-300 ${
                isCollapsed ? "md:hidden" : ""
              }`}>
                <p className="text-[10px] text-zinc-500 leading-none">Welcome back,</p>
                <p className="text-xs font-semibold text-zinc-200 mt-1">Investor</p>
              </div>
            </div>

            {/* Logout Button */}
            {!isCollapsed && (
              <button
                onClick={() => {
                  localStorage.removeItem("niveshiq_token");
                  localStorage.removeItem("niveshiq_refresh_token");
                  window.location.reload();
                }}
                className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-800 hover:text-rose-400 transition-colors focus:outline-none cursor-pointer"
                title="Log Out"
              >
                <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
