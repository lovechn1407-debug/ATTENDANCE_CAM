"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  subscribeToStudents, 
  subscribeToDatasets, 
  subscribeToAttendanceLogs, 
  verifyStaffLogin, 
  updateAttendanceForDate 
} from "@/lib/firebase";
import { 
  UserCheck, 
  LogOut, 
  Calendar, 
  Clock, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Filter, 
  Layers, 
  User, 
  Lock, 
  Key, 
  RefreshCw, 
  Sparkles, 
  ShieldCheck, 
  CheckSquare, 
  AlertCircle,
  ChevronRight,
  Edit3
} from "lucide-react";

export default function StaffPanelPage() {
  // Authentication State
  const [currentStaff, setCurrentStaff] = useState(null);
  const [inputStaffId, setInputStaffId] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Realtime Data
  const [students, setStudents] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);

  // Selected Dataset & Date
  const [selectedDatasetId, setSelectedDatasetId] = useState("");
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "PRESENT" | "ABSENT"
  const [currentTime, setCurrentTime] = useState("");
  const [toastMsg, setToastMsg] = useState("");

  // Check stored staff session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem("staff_session");
    if (stored) {
      try {
        const staffObj = JSON.parse(stored);
        setCurrentStaff(staffObj);
      } catch {}
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Subscriptions
  useEffect(() => {
    if (!currentStaff) return;
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubDatasets = subscribeToDatasets(setDatasets);
    const unsubLogs = subscribeToAttendanceLogs(setAttendanceLogs);

    return () => {
      unsubStudents();
      unsubDatasets();
      unsubLogs();
    };
  }, [currentStaff]);

  // Filter assigned datasets for this logged-in staff
  const assignedDatasets = useMemo(() => {
    if (!currentStaff) return [];
    const assignedIds = currentStaff.assignedDatasets || [];
    if (assignedIds.length === 0) return [];
    return datasets.filter((d) => assignedIds.includes(d.id));
  }, [datasets, currentStaff]);

  // Auto-select first dataset when assignedDatasets loads
  useEffect(() => {
    if (assignedDatasets.length > 0 && (!selectedDatasetId || !assignedDatasets.some(d => d.id === selectedDatasetId))) {
      setSelectedDatasetId(assignedDatasets[0].id);
    }
  }, [assignedDatasets, selectedDatasetId]);

  // Current Active Dataset object
  const activeDataset = useMemo(() => {
    return assignedDatasets.find((d) => d.id === selectedDatasetId) || assignedDatasets[0] || null;
  }, [assignedDatasets, selectedDatasetId]);

  // Students belonging to activeDataset
  const datasetStudents = useMemo(() => {
    if (!activeDataset) return [];
    return students.filter((student) => {
      if (activeDataset.studentIds && activeDataset.studentIds.length > 0) {
        return activeDataset.studentIds.includes(student.studentId || student.id);
      }
      const matchClass = activeDataset.classes?.length ? activeDataset.classes.includes(student.class) : true;
      const matchSection = activeDataset.sections?.length ? activeDataset.sections.includes(student.section) : true;
      const matchGroup = activeDataset.groups?.length ? activeDataset.groups.includes(student.group) : true;
      return matchClass && matchSection && matchGroup;
    });
  }, [students, activeDataset]);

  // Attendance lookup for selectedDate
  const logsForSelectedDate = useMemo(() => {
    return attendanceLogs.filter((log) => log.date === selectedDate);
  }, [attendanceLogs, selectedDate]);

  // Map student ID -> existing log for selectedDate
  const attendanceMap = useMemo(() => {
    const map = {};
    logsForSelectedDate.forEach((log) => {
      if (log.studentId) {
        map[log.studentId] = log;
      }
    });
    return map;
  }, [logsForSelectedDate]);

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!inputStaffId.trim() || !inputPassword.trim()) {
      setLoginError("Please enter Staff ID and Password.");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await verifyStaffLogin(inputStaffId.trim().toUpperCase(), inputPassword.trim());
      if (res.success && res.staff) {
        setCurrentStaff(res.staff);
        sessionStorage.setItem("staff_session", JSON.stringify(res.staff));
      } else {
        setLoginError(res.message || "Invalid Staff ID or Password.");
      }
    } catch (err) {
      setLoginError(err.message || "Login failed.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout
  const handleLogout = () => {
    setCurrentStaff(null);
    sessionStorage.removeItem("staff_session");
    setSelectedDatasetId("");
  };

  // Handle Mark Present / Absent toggle
  const handleToggleAttendance = async (student, targetStatus) => {
    const sName = student.name || "Student";
    try {
      const dsName = activeDataset ? activeDataset.name : "Staff Panel";
      await updateAttendanceForDate({
        student,
        date: selectedDate,
        status: targetStatus,
        datasetName: dsName
      });

      showToast(`Marked ${sName} as ${targetStatus} for ${selectedDate}`);
    } catch (err) {
      alert(`Failed to update attendance: ` + err.message);
    }
  };

  // Bulk Mark All
  const handleBulkMark = async (targetStatus) => {
    if (datasetStudents.length === 0) return;
    if (confirm(`Mark ALL ${datasetStudents.length} students as ${targetStatus} for date ${selectedDate}?`)) {
      try {
        const dsName = activeDataset ? activeDataset.name : "Staff Panel";
        for (const student of datasetStudents) {
          await updateAttendanceForDate({
            student,
            date: selectedDate,
            status: targetStatus,
            datasetName: dsName
          });
        }
        showToast(`Marked all ${datasetStudents.length} students as ${targetStatus}`);
      } catch (err) {
        alert("Error during bulk attendance update: " + err.message);
      }
    }
  };

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3000);
  };

  // Filtered Students list by search and status
  const displayedStudents = useMemo(() => {
    return datasetStudents.filter((s) => {
      const sId = s.studentId || s.id;
      const matchesSearch =
        (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sId && sId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.class && s.class.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.section && s.section.toLowerCase().includes(searchTerm.toLowerCase()));

      const isPresent = !!attendanceMap[sId];
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "PRESENT" && isPresent) ||
        (statusFilter === "ABSENT" && !isPresent);

      return matchesSearch && matchesStatus;
    });
  }, [datasetStudents, searchTerm, statusFilter, attendanceMap]);

  // Counts
  const presentCount = useMemo(() => {
    return datasetStudents.filter((s) => !!attendanceMap[s.studentId || s.id]).length;
  }, [datasetStudents, attendanceMap]);

  const absentCount = datasetStudents.length - presentCount;

  // ─── LOGIN VIEW ───────────────────────────────────────────────────────────
  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 font-sans text-slate-100 relative overflow-hidden">
        {/* Background Decorative Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-slate-800/90 border border-slate-700/80 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6 relative z-10 backdrop-blur-md"
        >
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/10">
              <UserCheck className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Staff Portal
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Enter authorized Staff ID &amp; Password to view &amp; edit student attendance.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-300 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Staff ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. STAFF01"
                  value={inputStaffId}
                  onChange={(e) => setInputStaffId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2"
            >
              {isLoggingIn ? "Authenticating..." : "Login to Staff Panel"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ─── DASHBOARD VIEW ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-2xl flex items-center gap-2 border border-emerald-400/40"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className="bg-slate-800/90 border-b border-slate-700/80 px-6 py-3.5 sticky top-0 z-30 flex items-center justify-between backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/20">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-white text-base tracking-tight leading-tight">
              BioAttend Staff Panel
            </h1>
            <span className="text-xs text-indigo-400 font-mono font-semibold flex items-center gap-1">
              <span>Staff ID:</span>
              <span>{currentStaff.staffId || currentStaff.id}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-300 font-sans">{currentStaff.name}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-900/80 rounded-xl text-slate-300 font-mono text-xs font-semibold border border-slate-700">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>{currentTime || "00:00:00 AM"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3.5 py-2 bg-slate-700/80 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-xl border border-slate-600 flex items-center gap-2 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Datasets Selection Bar */}
        <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-3xl space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" /> Assigned Datasets ({assignedDatasets.length})
            </h2>
            <span className="text-xs text-slate-400">Click a dataset to view &amp; edit attendance</span>
          </div>

          {assignedDatasets.length === 0 ? (
            <div className="p-6 bg-slate-900/60 rounded-2xl border border-slate-700 text-center text-slate-400 text-xs">
              No datasets assigned to your staff account yet. Please ask the Admin to assign datasets in Admin Panel &gt; Staff Management.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {assignedDatasets.map((ds) => {
                const isSelected = ds.id === selectedDatasetId;
                return (
                  <button
                    key={ds.id}
                    onClick={() => setSelectedDatasetId(ds.id)}
                    className={`p-4 rounded-2xl text-left transition-all border relative overflow-hidden group ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30"
                        : "bg-slate-900/70 text-slate-300 hover:bg-slate-900 border-slate-700/80 hover:border-slate-600"
                    }`}
                  >
                    <div className="font-bold text-sm truncate">{ds.name}</div>
                    <div className={`text-xs mt-1 font-mono ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                      {ds.classes?.length ? `${ds.classes.length} Classes` : "Custom"} • {ds.groups?.length ? `Grp ${ds.groups.join(",")}` : "All"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dataset Header Controls & Date Picker */}
        {activeDataset && (
          <div className="space-y-6">
            {/* Control Bar: Date Selector & Quick Stats */}
            <div className="bg-slate-800/80 border border-slate-700 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black text-white">{activeDataset.name}</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-xs font-bold">
                    Active Dataset
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Select date to check historical attendance logs or record edits.
                </p>
              </div>

              {/* Date Selection Box */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-3.5 py-2 rounded-2xl">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-sm font-mono font-bold text-white focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className={`px-3 py-2 rounded-2xl text-xs font-bold transition-all border ${
                    selectedDate === new Date().toISOString().split("T")[0]
                      ? "bg-indigo-600 text-white border-indigo-500 shadow-md"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Attendance Analytics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Students</div>
                  <div className="text-2xl font-black text-white mt-1">{datasetStudents.length}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-700/60 text-slate-300 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Present ({selectedDate})</div>
                  <div className="text-2xl font-black text-emerald-300 mt-1">{presentCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold border border-emerald-500/40">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              <div className="bg-rose-950/30 border border-rose-500/30 p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div>
                  <div className="text-xs text-rose-400 font-bold uppercase tracking-wider">Absent ({selectedDate})</div>
                  <div className="text-2xl font-black text-rose-300 mt-1">{absentCount}</div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-300 flex items-center justify-center font-bold border border-rose-500/40">
                  <XCircle className="w-5 h-5" />
                </div>
              </div>
            </div>

            {/* Student Search & Action Bar */}
            <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students by Name, ID, Class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-2xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
                <div className="bg-slate-900 p-1 rounded-2xl flex items-center gap-1 border border-slate-700">
                  {["ALL", "PRESENT", "ABSENT"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        statusFilter === st
                          ? "bg-indigo-600 text-white shadow-md"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {/* Bulk mark actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleBulkMark("PRESENT")}
                    className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 text-white text-xs font-bold rounded-2xl border border-emerald-500/50 shadow-sm"
                    title="Mark ALL students present for this date"
                  >
                    All Present
                  </button>
                  <button
                    onClick={() => handleBulkMark("ABSENT")}
                    className="px-3 py-2 bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-bold rounded-2xl border border-rose-500/50 shadow-sm"
                    title="Mark ALL students absent for this date"
                  >
                    All Absent
                  </button>
                </div>
              </div>
            </div>

            {/* Students Table / Cards List */}
            {displayedStudents.length === 0 ? (
              <div className="bg-slate-800/80 border border-slate-700 p-12 rounded-3xl text-center space-y-2">
                <User className="w-12 h-12 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">No Students Found</h3>
                <p className="text-xs text-slate-500">No student records match the active search or filter.</p>
              </div>
            ) : (
              <div className="bg-slate-800/80 border border-slate-700 rounded-3xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="bg-slate-900/80 text-xs uppercase tracking-wider font-extrabold text-slate-400 border-b border-slate-700">
                      <tr>
                        <th className="py-4 px-6">Student</th>
                        <th className="py-4 px-6">ID &amp; Class</th>
                        <th className="py-4 px-6 text-center">Status on {selectedDate}</th>
                        <th className="py-4 px-6 text-center">Scan Time</th>
                        <th className="py-4 px-6 text-right">Edit Attendance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/60 font-medium">
                      {displayedStudents.map((student) => {
                        const sId = student.studentId || student.id;
                        const existingLog = attendanceMap[sId];
                        const isPresent = !!existingLog;

                        return (
                          <tr key={sId} className="hover:bg-slate-700/40 transition-colors">
                            {/* Student Name & Photo */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                {student.photoUrl ? (
                                  <img
                                    src={student.photoUrl}
                                    alt={student.name}
                                    className="w-10 h-10 rounded-xl object-cover border border-slate-700 shadow-sm"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-700 text-indigo-300 flex items-center justify-center font-black text-sm border border-slate-600">
                                    {student.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <div className="font-bold text-white">{student.name}</div>
                                  <div className="text-xs text-slate-400 font-mono">Group {student.group || "A"}</div>
                                </div>
                              </div>
                            </td>

                            {/* ID & Class */}
                            <td className="py-4 px-6">
                              <div className="inline-block px-2.5 py-0.5 rounded-md bg-slate-900 text-indigo-400 font-mono text-xs font-bold border border-slate-700">
                                {sId}
                              </div>
                              <div className="text-xs text-slate-400 mt-1 font-semibold">
                                Class {student.class} - {student.section}
                              </div>
                            </td>

                            {/* Status Badge */}
                            <td className="py-4 px-6 text-center">
                              {isPresent ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>PRESENT</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-bold">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>ABSENT</span>
                                </span>
                              )}
                            </td>

                            {/* Scan Time */}
                            <td className="py-4 px-6 text-center font-mono text-xs text-slate-400">
                              {existingLog ? existingLog.formattedTime || "Recorded" : "--:--"}
                            </td>

                            {/* Edit Action Buttons */}
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleToggleAttendance(student, "PRESENT")}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                    isPresent
                                      ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40"
                                      : "bg-slate-900 hover:bg-emerald-600 text-slate-300 hover:text-white border border-slate-700"
                                  }`}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark Present</span>
                                </button>

                                <button
                                  onClick={() => handleToggleAttendance(student, "ABSENT")}
                                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                    !isPresent
                                      ? "bg-rose-600/30 text-rose-300 border border-rose-500/40"
                                      : "bg-slate-900 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700"
                                  }`}
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>Mark Absent</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
