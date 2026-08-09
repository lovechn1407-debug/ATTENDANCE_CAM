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
  Sparkles, 
  ShieldCheck, 
  AlertCircle,
  ChevronRight,
  Check,
  X,
  SlidersHorizontal,
  Users
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

      showToast(`Marked ${sName} as ${targetStatus}`);
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

  // ─── LIGHT THEME LOGIN VIEW ───────────────────────────────────────────────
  if (!currentStaff) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-slate-900 relative">
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-slate-200 p-8 rounded-3xl max-w-md w-full shadow-xl space-y-6 relative z-10"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-indigo-200">
              <UserCheck className="w-7 h-7" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              BioAttend Staff Portal
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Log in with Staff ID &amp; password to manage attendance datasets.
            </p>
          </div>

          {loginError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold text-center flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
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
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm uppercase tracking-wider rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-50 mt-2"
            >
              {isLoggingIn ? "Authenticating..." : "Login to Staff Panel"}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ─── LIGHT THEME DASHBOARD VIEW ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-bold text-xs shadow-xl flex items-center gap-2 border border-slate-700"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 sticky top-0 z-30 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-200">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight leading-tight">
              Staff Portal
            </h1>
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="font-bold text-indigo-600">ID: {currentStaff.staffId || currentStaff.id}</span>
              <span>•</span>
              <span className="truncate max-w-[120px] sm:max-w-none">{currentStaff.name}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-xl text-slate-700 font-mono text-xs font-semibold border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>{currentTime || "00:00:00 AM"}</span>
          </div>

          <button
            onClick={handleLogout}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-500" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-5">
        
        {/* Datasets Selection Bar */}
        <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" /> Assigned Datasets ({assignedDatasets.length})
            </h2>
            <span className="text-xs text-slate-400 hidden sm:inline">Tap to select attendance set</span>
          </div>

          {assignedDatasets.length === 0 ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 text-xs">
              No datasets assigned to your staff account yet. Contact Admin to assign access.
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {assignedDatasets.map((ds) => {
                const isSelected = ds.id === selectedDatasetId;
                return (
                  <button
                    key={ds.id}
                    onClick={() => setSelectedDatasetId(ds.id)}
                    className={`px-4 py-3 rounded-xl text-left transition-all border shrink-0 min-w-[160px] sm:min-w-[200px] ${
                      isSelected
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                        : "bg-slate-50 text-slate-800 hover:bg-slate-100 border-slate-200"
                    }`}
                  >
                    <div className="font-bold text-xs sm:text-sm truncate">{ds.name}</div>
                    <div className={`text-[11px] mt-0.5 font-mono ${isSelected ? "text-indigo-100" : "text-slate-500"}`}>
                      {ds.classes?.length ? `${ds.classes.length} Classes` : "Custom"}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Dataset Header & Date Selection Controls */}
        {activeDataset && (
          <div className="space-y-5">
            {/* Control Bar: Date Selector */}
            <div className="bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">{activeDataset.name}</h2>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-mono font-bold uppercase">
                    Active Set
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Showing roster and attendance status for selected date.
                </p>
              </div>

              {/* Date Input */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-slate-800">
                  <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="bg-transparent text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none cursor-pointer"
                  />
                </div>

                <button
                  onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                    selectedDate === new Date().toISOString().split("T")[0]
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                      : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Quick Analytics Summary Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-xs">
                <div className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Total</div>
                <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-0.5">{datasetStudents.length}</div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-2xl shadow-xs">
                <div className="text-[11px] text-emerald-700 font-bold uppercase tracking-wider">Present</div>
                <div className="text-xl sm:text-2xl font-extrabold text-emerald-700 mt-0.5">{presentCount}</div>
              </div>

              <div className="bg-rose-50/60 border border-rose-200 p-3.5 rounded-2xl shadow-xs">
                <div className="text-[11px] text-rose-700 font-bold uppercase tracking-wider">Absent</div>
                <div className="text-xl sm:text-2xl font-extrabold text-rose-700 mt-0.5">{absentCount}</div>
              </div>
            </div>

            {/* Filter & Action Controls */}
            <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search students by Name, ID, Class..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
                />
              </div>

              {/* Status Filter Tabs & Bulk Actions */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
                  {["ALL", "PRESENT", "ABSENT"].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === st
                          ? "bg-white text-indigo-700 shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleBulkMark("PRESENT")}
                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    title="Mark all present"
                  >
                    All Present
                  </button>
                  <button
                    onClick={() => handleBulkMark("ABSENT")}
                    className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs"
                    title="Mark all absent"
                  >
                    All Absent
                  </button>
                </div>
              </div>
            </div>

            {/* Roster Display */}
            {displayedStudents.length === 0 ? (
              <div className="bg-white border border-slate-200 p-10 rounded-2xl text-center space-y-2 shadow-xs">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h3 className="text-sm font-bold text-slate-700">No Students Found</h3>
                <p className="text-xs text-slate-400">No students match current search or status filter.</p>
              </div>
            ) : (
              <>
                {/* MOBILE PHONE COMPATIBLE VIEW (Cards view for small screens) */}
                <div className="block sm:hidden space-y-3">
                  {displayedStudents.map((student) => {
                    const sId = student.studentId || student.id;
                    const existingLog = attendanceMap[sId];
                    const isPresent = !!existingLog;

                    return (
                      <div
                        key={sId}
                        className={`bg-white border rounded-2xl p-4 shadow-xs space-y-3 transition-all ${
                          isPresent ? "border-emerald-200 bg-emerald-50/20" : "border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            {student.photoUrl ? (
                              <img
                                src={student.photoUrl}
                                alt={student.name}
                                className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm border border-indigo-200 shrink-0">
                                {student.name?.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-sm truncate">{student.name}</div>
                              <div className="text-xs text-slate-500 font-mono">
                                ID: {sId} • Cls {student.class}-{student.section}
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isPresent ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> PRESENT
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] border border-rose-200 flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-rose-600" /> ABSENT
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Tap Buttons on Mobile */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleToggleAttendance(student, "PRESENT")}
                            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                              isPresent
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200"
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Present</span>
                          </button>

                          <button
                            onClick={() => handleToggleAttendance(student, "ABSENT")}
                            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                              !isPresent
                                ? "bg-rose-600 text-white shadow-xs"
                                : "bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-700 border border-slate-200"
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Absent</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP / TABLET TABLE VIEW */}
                <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-700">
                      <thead className="bg-slate-50 text-xs uppercase tracking-wider font-bold text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="py-3.5 px-6">Student</th>
                          <th className="py-3.5 px-6">ID &amp; Class</th>
                          <th className="py-3.5 px-6 text-center">Status on {selectedDate}</th>
                          <th className="py-3.5 px-6 text-center">Scan Time</th>
                          <th className="py-3.5 px-6 text-right">Edit Attendance</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {displayedStudents.map((student) => {
                          const sId = student.studentId || student.id;
                          const existingLog = attendanceMap[sId];
                          const isPresent = !!existingLog;

                          return (
                            <tr key={sId} className="hover:bg-slate-50/80 transition-colors">
                              {/* Student Name & Photo */}
                              <td className="py-3.5 px-6">
                                <div className="flex items-center gap-3">
                                  {student.photoUrl ? (
                                    <img
                                      src={student.photoUrl}
                                      alt={student.name}
                                      className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs"
                                    />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm border border-indigo-200">
                                      {student.name?.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <div className="font-bold text-slate-900">{student.name}</div>
                                    <div className="text-xs text-slate-400 font-mono">Group {student.group || "A"}</div>
                                  </div>
                                </div>
                              </td>

                              {/* ID & Class */}
                              <td className="py-3.5 px-6">
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs font-bold border border-indigo-200">
                                  {sId}
                                </span>
                                <div className="text-xs text-slate-500 mt-0.5">
                                  Class {student.class} - {student.section}
                                </div>
                              </td>

                              {/* Status Badge */}
                              <td className="py-3.5 px-6 text-center">
                                {isPresent ? (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PRESENT
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                                    <XCircle className="w-3.5 h-3.5 text-rose-600" /> ABSENT
                                  </span>
                                )}
                              </td>

                              {/* Scan Time */}
                              <td className="py-3.5 px-6 text-center font-mono text-xs text-slate-500">
                                {existingLog ? existingLog.formattedTime || "Recorded" : "--:--"}
                              </td>

                              {/* Edit Action Buttons */}
                              <td className="py-3.5 px-6 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleToggleAttendance(student, "PRESENT")}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                      isPresent
                                        ? "bg-emerald-600 text-white shadow-2xs"
                                        : "bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200"
                                    }`}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Present</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleAttendance(student, "ABSENT")}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                                      !isPresent
                                        ? "bg-rose-600 text-white shadow-2xs"
                                        : "bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200"
                                    }`}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    <span>Absent</span>
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
