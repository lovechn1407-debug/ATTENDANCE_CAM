"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  UserCheck, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  Layers, 
  Search, 
  Key, 
  CheckSquare, 
  Square,
  ShieldAlert,
  X,
  Sparkles,
  BookOpen,
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  Building2
} from "lucide-react";
import { subscribeToStaffs, saveStaff, deleteStaff, bulkAddStaffs } from "@/lib/firebase";
import { parseStaffsCSV } from "@/lib/csvParser";

export default function StaffManager({ students = [], academicSettings = null }) {
  const deptsList = academicSettings?.departments || ["Computer Science", "Information Technology", "Electronics & Comm", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering"];
  const coursesList = academicSettings?.courses || ["B.Tech", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc", "MBA", "BBA"];
  const branchesList = academicSettings?.branches || ["CSE", "IT", "ECE", "ME", "EE", "CE", "AI/ML", "Data Science"];
  const sectionsList = academicSettings?.sections || ["A", "B", "C", "D", "1", "2"];
  const subjectsList = academicSettings?.subjects || ["Data Structures", "Operating Systems", "Computer Networks", "Database Systems", "Machine Learning", "Software Engineering"];

  const [staffs, setStaffs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Bulk CSV modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [parsedStaffs, setParsedStaffs] = useState([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [isUploadingBulk, setIsUploadingBulk] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const staffFileInputRef = useRef(null);

  // Form states
  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [selectedSubjects, setSelectedSubjects] = useState(["Data Structures", "Operating Systems"]);
  const [allotments, setAllotments] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  // Temporary allotment builder inputs
  const [newAllotSubject, setNewAllotSubject] = useState("Data Structures");
  const [newAllotDept, setNewAllotDept] = useState("Computer Science");
  const [newAllotCourse, setNewAllotCourse] = useState("B.Tech");
  const [newAllotBranch, setNewAllotBranch] = useState("CSE");
  const [newAllotSec, setNewAllotSec] = useState("A");
  const [newAllotGroup, setNewAllotGroup] = useState("ALL"); // "ALL" | "G1" | "G2"

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Realtime subscription to staffs list
  useEffect(() => {
    const unsub = subscribeToStaffs(setStaffs);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!department || !deptsList.includes(department)) {
      if (deptsList[0]) setDepartment(deptsList[0]);
    }
    if (!newAllotSubject || !subjectsList.includes(newAllotSubject)) {
      if (subjectsList[0]) setNewAllotSubject(subjectsList[0]);
    }
    if (!newAllotDept || !deptsList.includes(newAllotDept)) {
      if (deptsList[0]) setNewAllotDept(deptsList[0]);
    }
    if (!newAllotCourse || !coursesList.includes(newAllotCourse)) {
      if (coursesList[0]) setNewAllotCourse(coursesList[0]);
    }
    if (!newAllotBranch || !branchesList.includes(newAllotBranch)) {
      if (branchesList[0]) setNewAllotBranch(branchesList[0]);
    }
    if (!newAllotSec || !sectionsList.includes(newAllotSec)) {
      if (sectionsList[0]) setNewAllotSec(sectionsList[0]);
    }
  }, [academicSettings]);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setStaffId("");
    setStaffName("");
    setPassword("");
    setDepartment(deptsList[0] || "Computer Science");
    setSelectedSubjects(subjectsList.slice(0, 2));
    setAllotments([]);
    setNewAllotSubject(subjectsList[0] || "Data Structures");
    setNewAllotDept(deptsList[0] || "Computer Science");
    setNewAllotCourse(coursesList[0] || "B.Tech");
    setNewAllotBranch(branchesList[0] || "CSE");
    setNewAllotSec(sectionsList[0] || "A");
    setNewAllotGroup("ALL");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setEditingStaff(staff);
    setStaffId(staff.staffId || staff.id);
    setStaffName(staff.name || "");
    setPassword(staff.password || "");
    setDepartment(staff.department || deptsList[0] || "Computer Science");
    const existingSubs = Array.isArray(staff.subjects)
      ? staff.subjects
      : (staff.subjects ? staff.subjects.split(",").map(s => s.trim()).filter(Boolean) : [subjectsList[0] || "Data Structures"]);
    setSelectedSubjects(existingSubs);
    setAllotments(Array.isArray(staff.allotments) ? staff.allotments : []);
    setNewAllotSubject(existingSubs[0] || subjectsList[0] || "Data Structures");
    setNewAllotDept(staff.department || deptsList[0] || "Computer Science");
    setNewAllotCourse(coursesList[0] || "B.Tech");
    setNewAllotBranch(branchesList[0] || "CSE");
    setNewAllotSec(sectionsList[0] || "A");
    setNewAllotGroup("ALL");
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleAddAllotment = () => {
    if (!newAllotSubject.trim()) {
      alert("Please select a subject for the allotment.");
      return;
    }
    const newAllotment = {
      id: `ALLOT_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      subject: newAllotSubject.trim(),
      department: newAllotDept.trim(),
      course: newAllotCourse.trim(),
      branch: newAllotBranch.trim(),
      section: newAllotSec.trim().toUpperCase(),
      group: newAllotGroup
    };
    setAllotments(prev => [...prev, newAllotment]);

    // Automatically ensure subject is in selectedSubjects list
    if (!selectedSubjects.includes(newAllotSubject.trim())) {
      setSelectedSubjects(prev => [...prev, newAllotSubject.trim()]);
    }
  };

  const handleRemoveAllotment = (allotId) => {
    setAllotments(prev => prev.filter(a => a.id !== allotId));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!staffId.trim()) {
      setErrorMsg("Staff ID is required.");
      return;
    }
    if (!staffName.trim()) {
      setErrorMsg("Staff Name is required.");
      return;
    }
    if (!password.trim()) {
      setErrorMsg("Password is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const finalSubjects = selectedSubjects.length > 0 ? selectedSubjects : [newAllotSubject || "General"];

      await saveStaff({
        staffId: staffId.trim().toUpperCase(),
        name: staffName.trim(),
        password: password.trim(),
        department: department.trim(),
        subjects: finalSubjects,
        allotments: allotments
      });
      setIsModalOpen(false);
    } catch (err) {
      setErrorMsg(err.message || "Failed to save staff member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (staff) => {
    const sId = staff.staffId || staff.id;
    if (confirm(`Are you sure you want to delete staff account "${staff.name}" (${sId})?`)) {
      try {
        await deleteStaff(sId);
      } catch (err) {
        alert("Failed to delete staff: " + err.message);
      }
    }
  };

  const togglePasswordVisibility = (sId) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [sId]: !prev[sId]
    }));
  };

  // Bulk CSV Staff Handlers
  const handleStaffFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBulkFileName(file.name);
    setBulkError("");

    try {
      const data = await parseStaffsCSV(file);
      if (data.length === 0) {
        setBulkError("CSV file appears to be empty or missing headers.");
        setParsedStaffs([]);
      } else {
        setParsedStaffs(data);
      }
    } catch (err) {
      setBulkError("Error parsing staff CSV: " + err.message);
      setParsedStaffs([]);
    }
  };

  const handleBulkStaffSubmit = async () => {
    if (parsedStaffs.length === 0) return;
    setIsUploadingBulk(true);
    setBulkError("");

    try {
      await bulkAddStaffs(parsedStaffs);
      setIsBulkModalOpen(false);
      setParsedStaffs([]);
      setBulkFileName("");
    } catch (err) {
      setBulkError("Failed to upload staff to Firebase: " + err.message);
    } finally {
      setIsUploadingBulk(false);
    }
  };

  const downloadSampleStaffCSV = () => {
    const sampleCSV = `staffId,name,password,department,subjects
STAFF01,Prof. Alan Turing,pass123,Computer Science,Data Structures; Algorithms; Python
STAFF02,Dr. Grace Hopper,pass456,Computer Science,Compiler Design; Operating Systems
STAFF03,Prof. Nikola Tesla,pass789,Electrical,Circuit Analysis; Power Systems`;

    const blob = new Blob([sampleCSV], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "staff_import_template.csv";
    a.click();
  };

  const filteredStaffs = staffs.filter(
    (s) =>
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.staffId && s.staffId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.department && s.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" /> College Faculty Accounts &amp; Student Group Allotments
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage faculty credentials, subjects taught, and student group teaching allotments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setParsedStaffs([]);
              setBulkFileName("");
              setBulkError("");
              setIsBulkModalOpen(true);
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm rounded-xl border border-slate-200 flex items-center gap-2 transition-all shrink-0"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Import Staff CSV</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Faculty</span>
          </button>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by Name, Staff ID, or Department..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
          Total Faculty: {staffs.length}
        </span>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaffs.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Staff Accounts Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Add New Faculty" or "Import Staff CSV" above to create credentials and teaching allotments.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaffs.map((staff) => {
            const sId = staff.staffId || staff.id;
            const subjectsList = Array.isArray(staff.subjects) ? staff.subjects : [];
            const staffAllotments = Array.isArray(staff.allotments) ? staff.allotments : [];
            const isPasswordVisible = !!visiblePasswords[sId];

            return (
              <div
                key={sId}
                className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  {/* Top row: Name & ID Badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono text-[11px] font-bold border border-indigo-200">
                        <span>ID:</span>
                        <span>{sId}</span>
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 mt-1 leading-tight">
                        {staff.name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-400" />
                        <span>{staff.department || "Computer Science"}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(staff)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Staff Account & Allotments"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(staff)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                        title="Delete Staff Account"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Teaching Allotments Badges */}
                  <div className="mt-3 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-indigo-600" /> Teaching Allotments ({staffAllotments.length})
                      </span>
                    </div>

                    {staffAllotments.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">No specific group allotments added yet</span>
                    ) : (
                      <div className="space-y-1">
                        {staffAllotments.map((a, idx) => (
                          <div
                            key={a.id || idx}
                            className="p-1.5 bg-white rounded-lg border border-slate-200 text-[11px] flex items-center justify-between"
                          >
                            <div className="font-bold text-indigo-950 truncate max-w-[170px]">
                              {a.subject}
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              {a.branch}-{a.section} ({a.group || "ALL"})
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Password row */}
                  <div className="mt-3 flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-150">
                    <div className="flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-mono font-semibold text-slate-700">
                        {isPasswordVisible ? staff.password : "••••••••"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility(sId)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      {isPasswordVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Created: {new Date(staff.createdAt || Date.now()).toLocaleDateString()}</span>
                  <span className="text-indigo-600 font-sans font-bold">Faculty Authorized</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT STAFF MODAL WITH ALLOTMENT BUILDER */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-200 my-8">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {editingStaff ? "Edit Faculty Member & Allotments" : "Create New Faculty Account"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Set login credentials and configure student group teaching allotments
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Staff ID */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Staff ID / Username *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingStaff}
                    placeholder="e.g. STAFF01"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                  />
                </div>

                {/* Staff Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Faculty Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Prof. Alan Turing"
                    value={staffName}
                    onChange={(e) => setStaffName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Department *
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    {deptsList.map((d, i) => (
                      <option key={i} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Login Password *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. staff123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Assigned Subjects Category Tag Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Subjects Taught ({selectedSubjects.length} Selected) *</span>
                  <span className="text-[10px] text-slate-400 font-normal">Click tag to toggle</span>
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                  {subjectsList.map((sub, idx) => {
                    const isSelected = selectedSubjects.includes(sub);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSubjects(prev => prev.filter(s => s !== sub));
                          } else {
                            setSelectedSubjects(prev => [...prev, sub]);
                          }
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                          isSelected
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}{sub}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ─── TEACHING ALLOTMENT BUILDER SECTION ─── */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
                  <span>Add Student Group Teaching Allotment</span>
                  <span className="text-[10px] text-slate-400 font-normal">Specify target student criteria</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Subject</label>
                    <select
                      value={newAllotSubject}
                      onChange={(e) => setNewAllotSubject(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      {subjectsList.map((s, i) => (
                        <option key={i} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Department</label>
                    <select
                      value={newAllotDept}
                      onChange={(e) => setNewAllotDept(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      {deptsList.map((d, i) => (
                        <option key={i} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Course</label>
                    <select
                      value={newAllotCourse}
                      onChange={(e) => setNewAllotCourse(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      {coursesList.map((c, i) => (
                        <option key={i} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Branch</label>
                    <select
                      value={newAllotBranch}
                      onChange={(e) => setNewAllotBranch(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      {branchesList.map((b, i) => (
                        <option key={i} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Section</label>
                    <select
                      value={newAllotSec}
                      onChange={(e) => setNewAllotSec(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                    >
                      {sectionsList.map((sec, i) => (
                        <option key={i} value={sec}>Sec {sec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500">Group Allotment</label>
                    <select
                      value={newAllotGroup}
                      onChange={(e) => setNewAllotGroup(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-indigo-700"
                    >
                      <option value="ALL">ALL Groups (G1 + G2)</option>
                      <option value="G1">Group G1 Only</option>
                      <option value="G2">Group G2 Only</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddAllotment}
                  className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Add Allotment Rule
                </button>

                {/* Configured Allotments List */}
                {allotments.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-slate-200">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Current Allotments ({allotments.length}):
                    </div>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {allotments.map((a) => (
                        <div
                          key={a.id}
                          className="p-2 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-indigo-950">{a.subject}</span>
                            <span className="text-slate-500 ml-2 font-mono text-[11px]">
                              {a.course} {a.branch}-{a.section} ({a.group || "ALL"})
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveAllotment(a.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-150">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : editingStaff ? "Update Faculty & Allotments" : "Create Faculty Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK STAFF CSV IMPORT MODAL */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto font-sans">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 text-emerald-600 flex items-center justify-center font-bold">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    Bulk Import Faculty &amp; Subject Category
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload a CSV file containing staff credentials and subject categories
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />
                <span>{bulkError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Download Template Bar */}
              <div className="flex items-center justify-between bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <div className="font-bold text-slate-800">Download Faculty CSV Template</div>
                  <div className="text-[11px] text-slate-500">Pre-formatted headers: staffId, name, password, department, subjects</div>
                </div>
                <button
                  type="button"
                  onClick={downloadSampleStaffCSV}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Sample CSV
                </button>
              </div>

              {/* Upload Box */}
              <div
                onClick={() => staffFileInputRef.current?.click()}
                className="p-8 border-2 border-dashed border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/20 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer group transition-all"
              >
                <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 mb-2" />
                <span className="text-xs font-bold text-slate-800">
                  {bulkFileName ? bulkFileName : "Click to select Faculty CSV file"}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">Supports UTF-8 .csv files</span>
                <input
                  type="file"
                  ref={staffFileInputRef}
                  accept=".csv, text/csv"
                  onChange={handleStaffFileChange}
                  className="hidden"
                />
              </div>

              {/* Preview Table */}
              {parsedStaffs.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-slate-700">Preview ({parsedStaffs.length} Staff Members)</div>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                          <th className="p-2">ID</th>
                          <th className="p-2">Name</th>
                          <th className="p-2">Department</th>
                          <th className="p-2">Subjects</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {parsedStaffs.slice(0, 5).map((st, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-mono font-bold text-[11px]">{st.staffId}</td>
                            <td className="p-2 font-semibold text-slate-900">{st.name}</td>
                            <td className="p-2">{st.department}</td>
                            <td className="p-2 font-mono text-[11px] text-indigo-600">{st.subjects?.join(", ")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkStaffSubmit}
                disabled={parsedStaffs.length === 0 || isUploadingBulk}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 disabled:opacity-40"
              >
                {isUploadingBulk ? "Importing..." : `Import ${parsedStaffs.length} Faculty Members`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

