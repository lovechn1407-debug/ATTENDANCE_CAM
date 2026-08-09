"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CustomError({ error, reset }) {
  useEffect(() => {
    // Log the runtime error for diagnostics
    console.error("Unhandled Application Runtime Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans text-white relative overflow-hidden">
      {/* Subtle Background Radial Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="bg-slate-800/90 border border-slate-700 p-8 sm:p-10 rounded-3xl max-w-lg w-full shadow-2xl space-y-6 text-center relative z-10 backdrop-blur-md">
        {/* Animated Error Icon Header */}
        <div className="w-18 h-18 rounded-2xl bg-red-500/20 border-2 border-red-500/50 text-red-400 flex items-center justify-center mx-auto shadow-xl shadow-red-500/20 animate-pulse">
          <AlertOctagon className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 bg-red-950/80 text-red-300 border border-red-500/40 rounded-full text-xs font-mono font-bold tracking-widest uppercase">
            APPLICATION ERROR DETECTED
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Something Went Wrong
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 font-medium max-w-md mx-auto">
            An unexpected code exception occurred. Don't worry, your database records are safe.
          </p>
        </div>

        {/* Technical Error Message Snippet (if available) */}
        {error?.message && (
          <div className="p-4 bg-slate-950/80 border border-slate-700/80 rounded-2xl text-left font-mono text-xs text-red-300 overflow-x-auto max-h-32 scrollbar-thin">
            <span className="text-slate-500 font-sans font-bold block mb-1 uppercase text-[10px]">Error Details:</span>
            {error.message}
          </div>
        )}

        {/* Action Recovery Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            onClick={() => {
              if (reset) {
                reset();
              }
              window.location.reload();
            }}
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload &amp; Retry</span>
          </button>

          <Link
            href="/admin"
            className="w-full py-3.5 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-widest rounded-xl border border-slate-600 transition-all flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Return to Admin</span>
          </Link>
        </div>

        <div className="pt-2 text-[10px] text-slate-500 font-mono">
          BioAttend System • Error Boundary Active
        </div>
      </div>
    </div>
  );
}
