"use client";

import React, { useState } from "react";
import { 
  UserX, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert,
  UserCheck,
  Filter
} from "lucide-react";
import { toggleStudentSuspended } from "@/lib/firebase";

export default function SuspensionList({ students }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterMode, setFilterMode] = useState("ALL"); // "ALL" | "SUSPENDED" | "ACTIVE"

  const suspendedStudents = students.filter(s => s.suspended === true || s.isSuspended === true);
  const activeStudents = students.filter(s => !s.suspended && !s.isSuspended);

  const displayedStudents = students.filter(s => {
    const query = searchQuery.toLowerCase();
    const matchSearch = 
      s.name?.toLowerCase().includes(query) || 
      (s.studentId || s.id)?.toLowerCase().includes(query) || 
      s.class?.toLowerCase().includes(query);

    if (!matchSearch) return false;

    if (filterMode === "SUSPENDED") return s.suspended || s.isSuspended;
    if (filterMode === "ACTIVE") return !s.suspended && !s.isSuspended;
    return true;
  });

  const handleToggleSuspended = async (student) => {
    const studentId = student.studentId || student.id;
    const isCurrentlySuspended = student.suspended || student.isSuspended;
    const actionText = isCurrentlySuspended ? "Unsuspend / Reactivate" : "Suspend";

    if (confirm(`Are you sure you want to ${actionText} student "${student.name}" (ID: ${studentId})?`)) {
      try {
        await toggleStudentSuspended(studentId, !isCurrentlySuspended);
      } catch (err) {
        alert("Error updating suspension status: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserX className="w-5 h-5 text-red-600" /> Student Suspension Management List
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Suspended students will be blocked with a red SUSPENDED status on the screening panel.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1.5 bg-red-50 text-red-700 font-bold text-xs rounded-xl border border-red-200 flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>Currently Suspended: {suspendedStudents.length}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student by name, STU_ID, or class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => setFilterMode("ALL")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filterMode === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All ({students.length})
          </button>
          <button
            onClick={() => setFilterMode("SUSPENDED")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filterMode === "SUSPENDED"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Suspended ({suspendedStudents.length})
          </button>
          <button
            onClick={() => setFilterMode("ACTIVE")}
            className={`flex-1 sm:flex-initial px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              filterMode === "ACTIVE"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Active ({activeStudents.length})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-6">Student</th>
                <th className="py-3.5 px-6">STU_ID</th>
                <th className="py-3.5 px-6">Class &amp; Section</th>
                <th className="py-3.5 px-6">Group</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {displayedStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No students match the selected filter.
                  </td>
                </tr>
              ) : (
                displayedStudents.map((student) => {
                  const studentId = student.studentId || student.id;
                  const isSuspended = student.suspended || student.isSuspended;

                  return (
                    <tr key={studentId} className={isSuspended ? "bg-red-50/40" : "hover:bg-slate-50/60"}>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-10 h-10 rounded-xl object-cover border border-slate-200 bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-600">
                              {student.name?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="font-bold text-slate-900">{student.name}</div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-xs text-slate-500">
                        {studentId}
                      </td>

                      <td className="py-4 px-6 font-semibold text-slate-700">
                        Class {student.class} - {student.section}
                      </td>

                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-lg text-xs font-bold border border-amber-200">
                          Group {student.group}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        {isSuspended ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-300">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> SUSPENDED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Active
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleToggleSuspended(student)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSuspended
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                              : "bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                          }`}
                        >
                          {isSuspended ? "Unsuspend / Reactivate" : "Suspend Student"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
