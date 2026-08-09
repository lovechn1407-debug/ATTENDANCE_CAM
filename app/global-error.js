"use client";

import React, { useEffect } from "react";
import { AlertOctagon, RefreshCw } from "lucide-react";

export default function GlobalError({ error, reset }) {
  useEffect(() => {
    console.error("Global System Exception:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans text-white relative">
        <div className="bg-slate-800/90 border border-slate-700 p-8 sm:p-10 rounded-3xl max-w-lg w-full shadow-2xl space-y-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border-2 border-red-500/50 text-red-400 flex items-center justify-center mx-auto shadow-xl shadow-red-500/20 animate-pulse">
            <AlertOctagon className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white">Critical System Error</h1>
            <p className="text-xs text-slate-300">
              A root system error occurred. Please click below to reload the page.
            </p>
          </div>

          {error?.message && (
            <div className="p-3 bg-slate-950 rounded-xl text-left font-mono text-xs text-red-300 overflow-x-auto max-h-28">
              {error.message}
            </div>
          )}

          <button
            onClick={() => {
              if (reset) reset();
              window.location.reload();
            }}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reload Application</span>
          </button>
        </div>
      </body>
    </html>
  );
}
