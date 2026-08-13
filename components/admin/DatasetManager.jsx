"use client";

import React, { useState, useMemo } from "react";
import { 
  Sliders, 
  Plus, 
  Check, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  CheckSquare, 
  Square,
  AlertCircle,
  Sparkles,
  Layers,
  Search,
  UserCheck,
  Filter,
  Users,
  BookOpen,
  GraduationCap,
  Building2
} from "lucide-react";
import { saveDataset, toggleDatasetActive, deleteDataset } from "@/lib/firebase";

export default function DatasetManager({ datasets = [], students = [], staffs = [] }) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [selectionMode, setSelectionMode] = useState("FILTER"); // "FILTER" | "MANUAL"
  
  // Available subjects collected from Staffs + Default subjects
  const availableSubjects = useMemo(() => {
    const set = new Set([
      "Data Structures & Algorithms",
      "Database Management Systems",
      "Operating Systems",
      "Computer Networks",
      "Software Engineering",
      "Python Programming",
      "Machine Learning",
      "Web Technologies",
      "Discrete Mathematics",
      "Digital Logic Design"
    ]);

    staffs.forEach(staff => {
      if (Array.isArray(staff.subjects)) {
        staff.subjects.forEach(sub => {
          if (sub && sub.trim()) set.add(sub.trim());
        });
      }
    });

    datasets.forEach(ds => {
      if (ds.subject && ds.subject.trim()) set.add(ds.subject.trim());
    });

    return Array.from(set).sort();
  }, [staffs, datasets]);

  // Form Filter State
  const [department, setDepartment] = useState("Computer Science");
  const [course, setCourse] = useState("B.Tech");
  const [branch, setBranch] = useState("CSE");
  const [section, setSection] = useState("A");
  const [group, setGroup] = useState("G1");
  const [selectedSubject, setSelectedSubject] = useState(availableSubjects[0] || "Data Structures & Algorithms");

  // Selected Individual Students
  const [selectedStudentIds, setSelectedStudentIds] = useState(students.map(s => s.studentId || s.id));
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [saving, setSaving] = useState(false);

  // Toggle Helpers
  const toggleStudent = (id) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter(i => i !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const selectAllStudents = () => {
    setSelectedStudentIds(students.map(s => s.studentId || s.id));
  };

  const deselectAllStudents = () => {
    setSelectedStudentIds([]);
  };

  // Filtered Students for Manual Mode
  const filteredStudents = students.filter(s => {
    const query = studentSearchQuery.toLowerCase();
    const matchName = s.name?.toLowerCase().includes(query);
    const matchId = (s.studentId || s.id)?.toLowerCase().includes(query);
    const matchDept = s.department?.toLowerCase().includes(query);
    const matchBranch = s.branch?.toLowerCase().includes(query);
    return matchName || matchId || matchDept || matchBranch;
  });

  // Calculate matched count in FILTER mode
  const filterMatchedStudents = students.filter(s => {
    const matchDept = department ? (s.department || "Computer Science") === department : true;
    const matchCourse = course ? (s.course || s.class || "B.Tech") === course : true;
    const matchBranch = branch ? (s.branch || "CSE") === branch : true;
    const matchSec = section ? (s.section || "A") === section : true;
    const matchGrp = group ? (s.group || "G1") === group : true;
    return matchDept && matchCourse && matchBranch && matchSec && matchGrp;
  });

  const handleCreateDataset = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please give this dataset a title.");
      return;
    }

    if (selectionMode === "MANUAL" && selectedStudentIds.length === 0) {
      alert("Please select at least one student from the list.");
      return;
    }

    setSaving(true);
    try {
      await saveDataset({
        name: name.trim(),
        selectionMode,
        department,
        course,
        branch,
        section,
        group,
        subject: selectedSubject,
        studentIds: selectionMode === "MANUAL" ? selectedStudentIds : filterMatchedStudents.map(s => s.studentId || s.id),
        active: true
      });

      setName("");
      setIsCreating(false);
    } catch (err) {
      alert("Error saving dataset: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    try {
      await toggleDatasetActive(id, !currentStatus);
    } catch (err) {
      alert("Error toggling status: " + err.message);
    }
  };

  const handleDelete = async (id, datasetName) => {
    if (confirm(`Delete dataset "${datasetName}"?`)) {
      try {
        await deleteDataset(id);
      } catch (err) {
        alert("Error deleting dataset: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" /> College Class &amp; Subject Datasets
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create period attendance rosters by Department, Course, Branch, Section, Group &amp; Subject.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? "Cancel Generator" : "New Class Dataset"}</span>
        </button>
      </div>

      {/* Dataset Creation Form */}
      {isCreating && (
        <form onSubmit={handleCreateDataset} className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-md space-y-6 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Create Period Attendance Dataset
            </h3>
            <span className="text-xs text-slate-400 font-medium">College Roster Filter</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Dataset Title / Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CSE B.Tech 3rd Year Sec-A Data Structures"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-600" /> Select Subject *
              </label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {availableSubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
              Student Selection Method
            </label>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <button
                type="button"
                onClick={() => setSelectionMode("FILTER")}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  selectionMode === "FILTER"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>Class Roster Filter ({filterMatchedStudents.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectionMode("MANUAL")}
                className={`py-2.5 px-4 rounded-xl text-xs font-bold border flex items-center justify-center gap-2 transition-all ${
                  selectionMode === "MANUAL"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Select Specific Students ({selectedStudentIds.length})</span>
              </button>
            </div>
          </div>

          {/* FILTER MODE: College Hierarchy Dropdowns */}
          {selectionMode === "FILTER" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-5 gap-3 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
                {/* Department */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="Computer Science"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                {/* Course */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Course</label>
                  <input
                    type="text"
                    required
                    placeholder="B.Tech"
                    value={course}
                    onChange={(e) => setCourse(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                {/* Branch */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Branch</label>
                  <input
                    type="text"
                    required
                    placeholder="CSE"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                {/* Section */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Section</label>
                  <input
                    type="text"
                    required
                    placeholder="A"
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>

                {/* Group */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 uppercase">Group</label>
                  <input
                    type="text"
                    required
                    placeholder="G1"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                  />
                </div>
              </div>

              {/* Matched Students Summary Badge */}
              <div className="px-4 py-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-xs font-semibold text-indigo-900 flex items-center justify-between">
                <span>Matched Class Roster: <strong>{filterMatchedStudents.length} Students</strong></span>
                <span className="text-indigo-600">Total Enrolled DB: {students.length}</span>
              </div>
            </div>
          )}

          {/* MANUAL MODE: Searchable Student Selection List */}
          {selectionMode === "MANUAL" && (
            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student by name, ID, department..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={selectAllStudents}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={deselectAllStudents}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-600">
                Selected: <span className="text-indigo-600 font-extrabold">{selectedStudentIds.length}</span> / {students.length} Students
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {filteredStudents.length === 0 ? (
                  <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200">
                    No students match search query.
                  </div>
                ) : (
                  filteredStudents.map((st) => {
                    const stId = st.studentId || st.id;
                    const isSelected = selectedStudentIds.includes(stId);
                    return (
                      <div
                        key={stId}
                        onClick={() => toggleStudent(stId)}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-500/20"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded text-indigo-600 w-4 h-4 pointer-events-none"
                          />
                          {st.photoUrl ? (
                            <img src={st.photoUrl} alt={st.name} className="w-9 h-9 rounded-lg object-cover bg-slate-100" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                              {st.name.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div>
                            <div className="text-xs font-bold text-slate-900 leading-tight">{st.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">ID: {st.studentId}</div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-semibold">
                            {st.course || st.class} ({st.branch || "CSE"}) - {st.section}
                          </span>
                          <span className="px-2 py-0.5 bg-amber-50 text-amber-800 rounded text-[11px] font-semibold border border-amber-200">
                            Grp {st.group || "G1"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-sm text-slate-600 font-medium hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md"
            >
              {saving ? "Saving..." : "Save Class Dataset"}
            </button>
          </div>
        </form>
      )}

      {/* Dataset Cards List */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> Configured College Datasets ({datasets.length})
        </h3>

        {datasets.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-600">No College Datasets Created Yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "New Class Dataset" above to group students by Department, Course, Branch, Section, Group, and Subject.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {datasets.map((dataset) => (
              <div
                key={dataset.id}
                className={`bg-white p-5 rounded-2xl border transition-all ${
                  dataset.active
                    ? "border-emerald-300 shadow-md ring-1 ring-emerald-500/20"
                    : "border-slate-200 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base leading-snug">{dataset.name}</h4>
                    <div className="text-xs text-indigo-600 font-bold flex items-center gap-1 mt-0.5">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Subject: {dataset.subject || "General Subject"}</span>
                    </div>
                  </div>

                  {/* Toggle Active Switch */}
                  <button
                    onClick={() => handleToggleActive(dataset.id, dataset.active)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                      dataset.active
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {dataset.active ? (
                      <>
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                        <span>ACTIVE</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                        <span>INACTIVE</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Filter Tags & Student Count */}
                <div className="space-y-2 mb-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1"><UserCheck className="w-3.5 h-3.5 text-indigo-600" /> Matched Roster:</span>
                    <span className="font-mono text-indigo-700 font-extrabold">{dataset.studentIds?.length || 0} Students</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200">
                    <div>
                      <span className="text-slate-400 font-medium">Department: </span>
                      <span className="font-semibold text-slate-800">{dataset.department || "All"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Course: </span>
                      <span className="font-semibold text-slate-800">{dataset.course || "All"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Branch / Sec: </span>
                      <span className="font-semibold text-slate-800">{dataset.branch || "All"} - {dataset.section || "All"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Group: </span>
                      <span className="font-bold text-indigo-600">{dataset.group || "All"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-400 text-[11px]">
                    Created {new Date(dataset.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => handleDelete(dataset.id, dataset.name)}
                    className="text-slate-400 hover:text-red-600 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

