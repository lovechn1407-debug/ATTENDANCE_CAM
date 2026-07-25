"use client";

import React, { useState, useEffect } from "react";
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Calendar, 
  UserCheck, 
  CheckCircle2, 
  LogOut,
  Layers,
  Sparkles,
  AlertCircle,
  XCircle,
  Edit3,
  UserPlus,
  UserMinus,
  Grid,
  List
} from "lucide-react";
import { subscribeToAttendanceLogs, recordAttendance, removeAttendanceLog } from "@/lib/firebase";

export default function AttendanceRecords({ datasets = [], students = [] }) {
  const [logs, setLogs] = useState([]);
  const [viewMode, setViewMode] = useState("LOGS"); // "LOGS" | "SETWISE"
  
  // Log Stream filters
  const [searchTerm, setSearchTerm] = useState("");
  const [datasetFilter, setDatasetFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("");

  // Setwise View selection
  const [selectedDatasetId, setSelectedDatasetId] = useState(datasets[0]?.id || "ALL");

  // Realtime subscription to logs
  useEffect(() => {
    const unsub = subscribeToAttendanceLogs(setLogs);
    return () => unsub();
  }, []);

  // Sync selected dataset when datasets load
  useEffect(() => {
    if (datasets.length > 0 && selectedDatasetId === "ALL") {
      setSelectedDatasetId(datasets[0].id);
    }
  }, [datasets]);

  // Filter logs logic
  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      (log.name && log.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.studentId && log.studentId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.class && log.class.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (log.section && log.section.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDataset = datasetFilter === "ALL" || log.datasetName === datasetFilter;
    const matchesType = typeFilter === "ALL" || log.type === typeFilter;
    const matchesDate = !dateFilter || log.date === dateFilter;

    return matchesSearch && matchesDataset && matchesType && matchesDate;
  });

  // Calculate quick analytics
  const todayDate = new Date().toISOString().split("T")[0];
  const todayLogs = logs.filter((l) => l.date === todayDate);
  const entryCountToday = todayLogs.filter((l) => l.type === "ENTRY").length;
  const exitCountToday = todayLogs.filter((l) => l.type === "EXIT").length;
  const uniqueStudentsToday = new Set(todayLogs.map((l) => l.studentId)).size;

  // Setwise Data Preparation
  const activeDatasetObj = datasets.find(d => d.id === selectedDatasetId) || datasets[0];
  
  // Find all students belonging to activeDatasetObj
  const setwiseStudents = students.filter(student => {
    if (!activeDatasetObj) return true;
    if (activeDatasetObj.studentIds && activeDatasetObj.studentIds.length > 0) {
      return activeDatasetObj.studentIds.includes(student.studentId || student.id);
    }
    const matchClass = activeDatasetObj.classes?.length ? activeDatasetObj.classes.includes(student.class) : true;
    const matchSection = activeDatasetObj.sections?.length ? activeDatasetObj.sections.includes(student.section) : true;
    const matchGroup = activeDatasetObj.groups?.length ? activeDatasetObj.groups.includes(student.group) : true;
    return matchClass && matchSection && matchGroup;
  });

  // Handle Admin Manual Attendance Toggle
  const handleToggleManualStatus = async (student, isCurrentlyPresent, existingLog) => {
    const studentId = student.studentId || student.id;
    try {
      if (isCurrentlyPresent && existingLog) {
        // Mark Absent (remove log)
        if (confirm(`Mark "${student.name}" as ABSENT today?`)) {
          await removeAttendanceLog(existingLog.id);
        }
      } else {
        // Mark Present
        if (confirm(`Mark "${student.name}" as PRESENT today?`)) {
          await recordAttendance({
            studentId: studentId,
            name: student.name,
            class: student.class,
            section: student.section,
            group: student.group,
            datasetName: activeDatasetObj ? activeDatasetObj.name : "Manual Admin Entry",
            type: "ENTRY",
            timestamp: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      alert("Error updating manual attendance status: " + err.message);
    }
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert("No attendance records to export for current filters.");
      return;
    }

    const csvHeaders = ["Student ID", "Student Name", "Class", "Section", "Group", "Dataset Name", "Scan Type", "Date", "Time", "Timestamp"];
    const csvRows = filteredLogs.map((log) => [
      `"${log.studentId || ''}"`,
      `"${log.name || ''}"`,
      `"${log.class || ''}"`,
      `"${log.section || ''}"`,
      `"${log.group || ''}"`,
      `"${log.datasetName || ''}"`,
      `"${log.type || 'ENTRY'}"`,
      `"${log.date || ''}"`,
      `"${log.formattedTime || ''}"`,
      `"${log.timestamp || ''}"`
    ]);

    const csvContent = [csvHeaders.join(","), ...csvRows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Attendance_Records_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Mode Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" /> Attendance Records & Setwise Results
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            View live scan logs or check dataset (setwise) student attendance status with admin editing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setViewMode("LOGS")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "LOGS"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Log Activity Stream</span>
            </button>

            <button
              onClick={() => setViewMode("SETWISE")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "SETWISE"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Setwise Dataset View</span>
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Analytics Summary Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{todayLogs.length}</div>
            <div className="text-xs font-medium text-slate-500">Scans Recorded Today</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{entryCountToday}</div>
            <div className="text-xs font-medium text-slate-500">Entries Today</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{exitCountToday}</div>
            <div className="text-xs font-medium text-slate-500">Exits Today</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">{uniqueStudentsToday}</div>
            <div className="text-xs font-medium text-slate-500">Unique Students Verified</div>
          </div>
        </div>
      </div>

      {/* VIEW MODE 1: LOG ACTIVITY STREAM */}
      {viewMode === "LOGS" && (
        <div className="space-y-4">
          {/* Filter Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Search Student Name, ID, Class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-500 font-medium">Dataset:</span>
                <select
                  value={datasetFilter}
                  onChange={(e) => setDatasetFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Datasets</option>
                  {datasets.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Type:</span>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="ENTRY">Entry</option>
                  <option value="EXIT">Exit</option>
                </select>
              </div>

              <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-slate-200">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                />
                {dateFilter && (
                  <button
                    onClick={() => setDateFilter("")}
                    className="text-[10px] text-slate-400 hover:text-slate-600 font-bold ml-1"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student Info</th>
                    <th className="py-3.5 px-4">Class &amp; Sec</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Dataset</th>
                    <th className="py-3.5 px-4">Scan Type</th>
                    <th className="py-3.5 px-4 text-right">Date &amp; Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">No attendance logs recorded for these filters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 leading-tight">{log.name}</div>
                          <div className="text-xs font-mono text-indigo-600">ID: {log.studentId}</div>
                        </td>

                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                            Class {log.class} - {log.section}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                            log.group === "A"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}>
                            Group {log.group}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-xs font-medium text-slate-700">
                          {log.datasetName || "General"}
                        </td>

                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            log.type === "ENTRY"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}>
                            {log.type === "ENTRY" ? (
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <LogOut className="w-3 h-3 text-amber-600" />
                            )}
                            {log.type}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="font-mono font-bold text-slate-900 text-xs">{log.formattedTime}</div>
                          <div className="text-[11px] text-slate-400">{log.date}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: SETWISE DATASET ATTENDANCE TABLE WITH ADMIN EDITING */}
      {viewMode === "SETWISE" && (
        <div className="space-y-4">
          {/* Dataset Selector Banner */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-600" />
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select Dataset Set</div>
                <select
                  value={selectedDatasetId}
                  onChange={(e) => setSelectedDatasetId(e.target.value)}
                  className="text-base font-bold text-slate-900 bg-transparent focus:outline-none cursor-pointer"
                >
                  {datasets.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.active ? "ACTIVE" : "INACTIVE"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Setwise Summary Counters */}
            <div className="flex items-center gap-3">
              <div className="px-3 py-1.5 bg-slate-100 rounded-xl text-xs font-bold text-slate-700">
                Total Set Students: {setwiseStudents.length}
              </div>
              <div className="px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300">
                Present Today: {setwiseStudents.filter(s => {
                  const sId = s.studentId || s.id;
                  return todayLogs.some(l => (l.studentId === sId || l.studentId === s.id) && l.date === todayDate);
                }).length}
              </div>
              <div className="px-3 py-1.5 bg-red-100 text-red-800 rounded-xl text-xs font-bold border border-red-300">
                Absent Today: {setwiseStudents.filter(s => {
                  const sId = s.studentId || s.id;
                  return !todayLogs.some(l => (l.studentId === sId || l.studentId === s.id) && l.date === todayDate);
                }).length}
              </div>
            </div>
          </div>

          {/* Setwise Students Attendance Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Student</th>
                    <th className="py-3.5 px-4">STU_ID</th>
                    <th className="py-3.5 px-4">Class &amp; Sec</th>
                    <th className="py-3.5 px-4">Group</th>
                    <th className="py-3.5 px-4">Today's Status</th>
                    <th className="py-3.5 px-4 text-right">Admin Edit Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                  {setwiseStudents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="font-medium text-slate-600">No students found in this dataset set.</p>
                      </td>
                    </tr>
                  ) : (
                    setwiseStudents.map((student) => {
                      const studentId = student.studentId || student.id;
                      const existingLog = todayLogs.find(
                        (l) => (l.studentId === studentId || l.studentId === student.id) && l.date === todayDate
                      );
                      const isPresent = !!existingLog;
                      const isSuspended = student.suspended || student.isSuspended;

                      return (
                        <tr key={studentId} className={isSuspended ? "bg-red-50/40" : "hover:bg-slate-50/60"}>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {student.photoUrl ? (
                                <img src={student.photoUrl} alt={student.name} className="w-9 h-9 rounded-lg object-cover bg-slate-100" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                                  {student.name?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <div className="font-bold text-slate-900 leading-tight">{student.name}</div>
                                {isSuspended && (
                                  <span className="text-[10px] text-red-600 font-extrabold uppercase">[SUSPENDED]</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-xs text-slate-500">
                            {studentId}
                          </td>

                          <td className="py-3 px-4 text-xs font-semibold text-slate-700">
                            Class {student.class} - {student.section}
                          </td>

                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 bg-amber-50 text-amber-800 rounded text-xs font-bold border border-amber-200">
                              Group {student.group}
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            {isPresent ? (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold border border-emerald-300">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>PRESENT [{existingLog.formattedTime}]</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-bold border border-red-300">
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                                <span>ABSENT</span>
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleToggleManualStatus(student, isPresent, existingLog)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ml-auto ${
                                isPresent
                                  ? "bg-slate-100 hover:bg-red-100 text-slate-700 hover:text-red-700 border-slate-200 hover:border-red-300"
                                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-xs"
                              }`}
                            >
                              {isPresent ? (
                                <>
                                  <UserMinus className="w-3.5 h-3.5" />
                                  <span>Mark Absent</span>
                                </>
                              ) : (
                                <>
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Mark Present</span>
                                </>
                              )}
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
      )}
    </div>
  );
}
