"use client";

import Link from "next/link";
import { useApp } from "../state/AppProvider";
import Sidebar from "./Sidebar";

export default function SidebarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { dispatch } = useApp();

  return (
    <>
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative bg-slate-50/50 flex flex-col h-full">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 pb-3 flex items-center justify-between sticky top-0 z-10 shadow-sm" style={{ paddingTop: 'calc(0.75rem + env(safe-area-inset-top, 0px))' }}>
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md">
              P
            </div>
          </Link>
          <button
            onClick={() => dispatch({ type: "TOGGLE_SIDEBAR" })}
            className="p-2 -mr-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>

        {/* Subtle background decoration */}
        <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 overflow-hidden opacity-30">
          <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-200 blur-3xl mix-blend-multiply filter opacity-50 animate-blob"></div>
          <div className="absolute top-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-indigo-200 blur-3xl mix-blend-multiply filter opacity-50 animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] rounded-full bg-blue-100 blur-3xl mix-blend-multiply filter opacity-50 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative z-10 flex-1">{children}</div>
      </main>
    </>
  );
}
