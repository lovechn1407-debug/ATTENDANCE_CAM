"use client";

import React from "react";
import Link from "next/link";
import { Sliders, Clock, Settings, ShieldCheck, Sparkles } from "lucide-react";

export default function DatasetHeader({ activeDatasets, currentTime }) {
  const primaryDataset = activeDatasets.length > 0 ? activeDatasets[0] : null;

  return (
    <div className="w-full bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">BioAttend Scanner</h1>
            <p className="text-[10px] text-slate-400 font-medium">9:16 Portrait Mode</p>
          </div>
        </div>

        <Link
          href="/admin"
          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Open Admin Panel"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>

      {/* Dataset Timing Badge */}
      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-slate-800 line-clamp-1">
            {primaryDataset ? primaryDataset.name : "Master Database Mode"}
          </span>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
          <Clock className="w-3 h-3 text-indigo-500" />
          <span>{currentTime || "00:00:00"}</span>
        </div>
      </div>
    </div>
  );
}
