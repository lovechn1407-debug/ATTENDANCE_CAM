"use client";

import React from "react";
import Link from "next/link";
import { 
  Users, 
  Sliders, 
  Camera, 
  ClipboardList,
  Scan, 
  ShieldCheck, 
  ChevronRight,
  Sparkles,
  UserX,
  UserCheck
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab }) {
  const navItems = [
    {
      id: "students",
      label: "Student Master Data",
      description: "Manage master student database, add & bulk upload",
      icon: Users,
      badge: "Master"
    },
    {
      id: "attendance",
      label: "Attendance Records",
      description: "View logs grouped by college period & export CSV",
      icon: ClipboardList,
      badge: "Logs"
    },
    {
      id: "staff",
      label: "Staff Allotment & Accounts",
      description: "Manage faculty & assign student group teaching allotments",
      icon: UserCheck,
      badge: "Allot"
    },
    {
      id: "suspension",
      label: "Suspension List",
      description: "Manage suspended students & block entry",
      icon: UserX,
      badge: "Blocked"
    },
    {
      id: "academic",
      label: "Academic Settings",
      description: "Manage courses, subjects, branches & dropdown options",
      icon: Sliders,
      badge: "Options"
    },
    {
      id: "camera",
      label: "Configure Screen",
      description: "Select webcam hardware & match sensitivity",
      icon: Camera,
      badge: "Device"
    }
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-sm z-20">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-200">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg tracking-tight leading-tight">BioAttend</h1>
              <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-500 fill-indigo-500" /> Biometric AI System
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5">
          <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Admin Management
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center justify-between group ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/60 shadow-xs"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg transition-colors ${
                    isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm leading-snug">{item.label}</div>
                    <div className="text-[11px] text-slate-400 font-normal line-clamp-1">{item.description}</div>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? "text-indigo-600 translate-x-0.5" : "text-slate-300 opacity-0 group-hover:opacity-100"}`} />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer: Link to Live Scanner Panel */}
      <div className="p-4 border-t border-slate-100">
        <Link
          href="/screening"
          target="_blank"
          className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium text-sm flex items-center justify-center gap-2.5 transition-all shadow-md shadow-slate-300 group"
        >
          <Scan className="w-4 h-4 text-emerald-400 group-hover:rotate-90 transition-transform duration-300" />
          <span>Launch Scanner (9:16)</span>
        </Link>
      </div>
    </aside>
  );
}
