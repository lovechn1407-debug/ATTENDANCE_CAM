"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, Home, ShieldCheck } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans text-white relative">
      <div className="bg-slate-800/90 border border-slate-700 p-8 sm:p-10 rounded-3xl max-w-md w-full shadow-2xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 border-2 border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-xl shadow-indigo-500/20">
          <HelpCircle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="text-4xl font-black text-indigo-400 font-mono">404</span>
          <h1 className="text-xl font-extrabold text-white">Page Not Found</h1>
          <p className="text-xs text-slate-400">
            The page you requested does not exist or has been moved.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin"
            className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Admin Panel</span>
          </Link>

          <Link
            href="/staff"
            className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs uppercase tracking-wider rounded-xl border border-slate-600 flex items-center justify-center gap-2"
          >
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Staff Panel</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
