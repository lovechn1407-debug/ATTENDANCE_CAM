"use client";

import React from "react";
import Link from "next/link";
import { Sliders, Clock, Settings, ShieldCheck, Sparkles, User, BookOpen, Tv } from "lucide-react";

export default function DatasetHeader({ activeSession, screenId, currentTime }) {
  const isActive = activeSession && activeSession.active;

  return (
    <div className="w-full bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-extrabold tracking-tight text-white">College Screening Panel</h1>
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30">
                {screenId || "SCREEN_01"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Realtime Face Recognition Attendance</p>
          </div>
        </div>

        <Link
          href="/staff"
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-xs font-semibold flex items-center gap-1"
          title="Open Staff Panel"
        >
          <Settings className="w-4 h-4" />
          <span className="hidden sm:inline">Staff Panel</span>
        </Link>
      </div>

      {/* Staff Name & Subject Header Banner */}
      {isActive ? (
        <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 p-3 rounded-xl border border-indigo-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-1 text-emerald-300 font-bold">
                <BookOpen className="w-3.5 h-3.5" />
                <span className="text-sm">{activeSession.subject || "General Subject"}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-indigo-300 bg-slate-900/90 px-2 py-0.5 rounded border border-indigo-500/30 shrink-0">
              <Clock className="w-3 h-3 text-indigo-400" />
              <span>{currentTime || "00:00:00"}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 border-t border-indigo-500/20 pt-2">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              <span>Faculty: <strong className="text-white">{activeSession.staffName}</strong></span>
            </div>
            <div className="text-[11px] font-mono text-slate-300">
              Class: {activeSession.course || "B.Tech"} {activeSession.branch || "CSE"}-{activeSession.section || "A"} ({activeSession.group || "ALL"}) • {activeSession.studentIds?.length || 0} Students
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-amber-300 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping shrink-0" />
            <span>Screening Standby — Waiting for Faculty to Activate Class</span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 shrink-0">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>{currentTime || "00:00:00"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

