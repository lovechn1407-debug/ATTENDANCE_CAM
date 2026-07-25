"use client";

import React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Users, 
  Scan, 
  Sliders, 
  Camera, 
  Sparkles, 
  ArrowRight,
  Database,
  Cloud,
  Eye,
  CheckCircle2
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between p-6 sm:p-12">
      {/* Top Navbar */}
      <header className="max-w-6xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-xl tracking-tight leading-none">BioAttend AI</h1>
            <p className="text-xs text-slate-500 font-medium">Face & Eye-Landmark Attendance System</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Vercel Ready
          </span>
        </div>
      </header>

      {/* Main Hero & Mode Selector */}
      <main className="max-w-5xl mx-auto w-full my-auto py-12 space-y-12">
        <div className="text-center space-y-4 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Biometric AI Attendance Scanner
          </div>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Next-Gen Facial & Eye Landmark Verification
          </h2>
          <p className="text-slate-600 text-base leading-relaxed">
            Real-time browser-based face recognition, 68-point retina landmark scanning, Firebase Realtime Database sync, and ImgBB image hosting.
          </p>
        </div>

        {/* Two Main Cards: Admin Panel vs Screening Scanner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Admin Panel */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group">
            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 group-hover:scale-110 transition-transform">
                <Users className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-2xl font-bold text-slate-900">Module 1: Admin Panel</h3>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Manage master student records, bulk upload CSV files, set Entry/Exit dataset timing windows, and configure hardware cameras.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Master Student Database & ImgBB Uploads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> CSV/Excel Bulk Import Parser
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Entry/Exit Dataset Rules & Timing Toggles
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600" /> Hardware Camera Selection & Sensitivity Tuning
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/admin"
                className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all group-hover:gap-3"
              >
                <span>Open Admin Panel</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Card 2: Screening Panel (9:16 Scanner) */}
          <div className="bg-white p-8 rounded-3xl border-2 border-emerald-400 shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
            <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition-transform">
                <Scan className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-bold text-slate-900">Module 2: Screening Panel</h3>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">9:16 Portrait</span>
                </div>
                <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                  Front-facing attendance scanner featuring a circular webcam feed, eye landmark mesh, glowing green success ring, and live RTDB logs.
                </p>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-700 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Strict 9:16 Centered Portrait Container
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Circular Webcam Feed & Eye Landmark Overlay
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Modern Glowing Green Success Animation & Audio Chime
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Realtime Firebase Attendance Log Recording
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href="/screening"
                className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-slate-300 transition-all group-hover:gap-3"
              >
                <span>Launch Attendance Scanner</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* Infrastructure & Stack Badges */}
        <div className="pt-8 border-t border-slate-200 flex flex-wrap items-center justify-center gap-8 text-slate-500 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-500" />
            <span>Firebase Realtime Database</span>
          </div>
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-blue-500" />
            <span>ImgBB Cloud API</span>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-500" />
            <span>68-Point Face & Eye Landmarks</span>
          </div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            <span>Next.js 14 App Router</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto w-full text-center text-xs text-slate-400 py-4">
        BioAttend System • Built for Vercel Deployment
      </footer>
    </div>
  );
}
