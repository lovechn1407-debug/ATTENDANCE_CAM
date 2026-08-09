"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function CustomError({ error, reset }) {
  useEffect(() => {
    console.error("Unhandled Application Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between items-center p-6 sm:p-10 relative overflow-hidden select-none">
      {/* Background Red Glow Accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[450px] bg-red-950/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Section: School Logo */}
      <header className="w-full max-w-2xl flex flex-col items-center pt-4 z-10">
        <div className="bg-white/95 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-white/20">
          <img
            src="/school-logo.png"
            alt="ITS Engineering College"
            className="h-12 sm:h-16 w-auto object-contain"
          />
        </div>
      </header>

      {/* Main Center Content: Error Icon, Code & Buttons */}
      <main className="w-full max-w-md my-auto flex flex-col items-center text-center space-y-6 z-10 py-8">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-red-600/20 blur-xl animate-pulse" />
          <div className="w-24 h-24 rounded-3xl bg-neutral-900 border-2 border-red-500/50 flex flex-col items-center justify-center text-red-500 shadow-2xl relative z-10">
            <AlertOctagon className="w-10 h-10 animate-bounce" />
            <span className="text-[10px] font-mono font-black tracking-widest uppercase mt-0.5 text-red-400">
              SYS_ERR
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-rose-400 to-amber-500">
            ERROR 500
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            SOMETHING WENT WRONG
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed">
            An unexpected runtime exception occurred. Click reload to restore application state.
          </p>
        </div>

        {error?.message && (
          <div className="w-full p-3 bg-neutral-900/90 border border-neutral-800 rounded-2xl text-left font-mono text-xs text-red-300 overflow-x-auto max-h-28 scrollbar-thin">
            <span className="text-neutral-500 font-sans font-bold block mb-1 uppercase text-[10px]">Error Details:</span>
            {error.message}
          </div>
        )}

        <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              if (reset) reset();
              window.location.reload();
            }}
            className="w-full py-3.5 px-4 bg-red-700 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-red-900/40 border border-red-500/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload &amp; Retry</span>
          </button>

          <Link
            href="/admin"
            className="w-full py-3.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-neutral-700 flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Admin Panel</span>
          </Link>
        </div>
      </main>

      {/* Footer Section: AS Studios Logo & Copyright */}
      <footer className="w-full max-w-md flex flex-col items-center space-y-3 pb-4 z-10">
        <div className="bg-white/95 backdrop-blur-md px-5 py-2 rounded-xl shadow-lg border border-white/20">
          <img
            src="/as-studios-logo.png"
            alt="AS STUDIOS"
            className="h-7 sm:h-9 w-auto object-contain"
          />
        </div>

        <p className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase font-semibold text-center">
          © {new Date().getFullYear()} AS STUDIOS • ALL RIGHTS RESERVED
        </p>
      </footer>
    </div>
  );
}
