"use client";

import React from "react";
import { CheckCircle2, Clock, ShieldCheck, AlertCircle, AlertTriangle } from "lucide-react";

export default function MatchResultCard({ studentMatch, logRecord, isAlreadyMarked }) {
  if (!studentMatch) return null;

  const { student, confidence } = studentMatch;
  const timeString = logRecord?.formattedTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className={`w-full bg-white rounded-3xl p-5 border-2 shadow-xl animate-in fade-in slide-in-from-bottom-4 duration-300 space-y-4 ${
      isAlreadyMarked 
        ? "border-amber-400 shadow-amber-500/10" 
        : "border-emerald-400 shadow-emerald-500/10"
    }`}>
      {/* Verified Status Banner */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        {isAlreadyMarked ? (
          <div className="flex items-center gap-2 text-amber-700 font-bold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>Attendance Already Marked Today</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
            <span>Attendance Marked Successfully</span>
          </div>
        )}

        <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${
          isAlreadyMarked
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-emerald-50 text-emerald-700 border-emerald-200"
        }`}>
          {confidence}% Confidence
        </span>
      </div>

      {/* Student Profile Info */}
      <div className="flex items-center gap-4">
        {student.photoUrl ? (
          <img
            src={student.photoUrl}
            alt={student.name}
            className={`w-16 h-16 rounded-2xl object-cover border-2 shadow-md ${
              isAlreadyMarked ? "border-amber-400" : "border-emerald-400"
            }`}
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center border-2 border-indigo-300 shadow-md">
            {student.name.charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-extrabold text-slate-900 leading-tight truncate">
            {student.name}
          </h3>
          <div className="text-xs font-mono font-semibold text-indigo-600 mt-0.5">
            ID: {student.studentId}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200">
              Class {student.class} - {student.section}
            </span>
            <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-[11px] font-bold border border-indigo-200">
              Group {student.group}
            </span>
          </div>
        </div>
      </div>

      {/* Entry Timestamp & Log Status */}
      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <Clock className="w-4 h-4 text-slate-500" />
          <span>Timestamp:</span>
          <span className="font-mono text-slate-900 font-bold">{timeString}</span>
        </div>

        <span className={`text-[11px] font-semibold flex items-center gap-1 ${
          isAlreadyMarked ? "text-amber-700" : "text-emerald-700"
        }`}>
          <ShieldCheck className="w-3.5 h-3.5" />
          {isAlreadyMarked ? "Already Verified" : "Firebase Synced"}
        </span>
      </div>
    </div>
  );
}
