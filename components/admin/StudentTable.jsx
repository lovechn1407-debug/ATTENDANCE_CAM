"use client";

import React, { useState, useMemo } from "react";
import { 
  Search, 
  UserPlus, 
  FileSpreadsheet, 
  Trash2, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  UserCheck, 
  Building2,
  Users,
  Camera,
  Edit,
  GraduationCap
} from "lucide-react";
import { deleteStudent } from "@/lib/firebase";

export default function StudentTable({ 
  students, 
  onOpenAddModal, 
  onOpenBulkModal, 
  onOpenUpdatePhotosModal,
  onEditStudent 
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);

  // Missing photos count
  const missingPhotosCount = students.filter(s => !s.photoUrl || s.photoUrl.trim() === "").length;

  // Extract unique departments, courses, and branches
  const availableDepartments = useMemo(() => Array.from(new Set(students.map(s => s.department || "Computer Science"))).sort(), [students]);
  const availableCourses = useMemo(() => Array.from(new Set(students.map(s => s.course || s.class || "B.Tech"))).sort(), [students]);
  const availableBranches = useMemo(() => Array.from(new Set(students.map(s => s.branch || "CSE"))).sort(), [students]);

  // Filter students logic
  const filteredStudents = students.filter((student) => {
    const query = searchTerm.toLowerCase();
    const matchesSearch =
      (student.name && student.name.toLowerCase().includes(query)) ||
      (student.studentId && student.studentId.toLowerCase().includes(query)) ||
      (student.department && student.department.toLowerCase().includes(query)) ||
      (student.course && student.course.toLowerCase().includes(query)) ||
      (student.branch && student.branch.toLowerCase().includes(query)) ||
      (student.section && student.section.toLowerCase().includes(query)) ||
      (student.group && student.group.toLowerCase().includes(query));

    const matchesDept = departmentFilter === "ALL" || (student.department || "Computer Science") === departmentFilter;
    const matchesCourse = courseFilter === "ALL" || (student.course || student.class) === courseFilter;
    const matchesBranch = branchFilter === "ALL" || (student.branch || "CSE") === branchFilter;

    return matchesSearch && matchesDept && matchesCourse && matchesBranch;
  });

  const handleDelete = async (id, name) => {
    if (confirm(`Are you sure you want to delete student "${name}"?`)) {
      try {
        setDeletingId(id);
        await deleteStudent(id);
      } catch (err) {
        alert("Failed to delete student: " + err.message);
      } finally {
        setDeletingId(null);
      }
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" /> College Master Student Database
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Total Enrolled: <span className="font-semibold text-slate-800">{students.length}</span> students across departments &amp; courses.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Update Photos Button with Counter */}
          <button
            onClick={onOpenUpdatePhotosModal}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${
              missingPhotosCount > 0
                ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200"
                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Update Photos ({missingPhotosCount})</span>
          </button>

          <button
            onClick={onOpenBulkModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-xs flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk CSV Upload</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, ID, Dept, Course, Branch, Sec..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Dept:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[130px] truncate"
            >
              <option value="ALL">All Depts</option>
              {availableDepartments.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          {/* Course Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Course:</span>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Courses</option>
              {availableCourses.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Branch:</span>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Branches</option>
              {availableBranches.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Info</th>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Department &amp; Course</th>
                <th className="py-3.5 px-4">Branch / Sec / Group</th>
                <th className="py-3.5 px-4">Biometric Descriptor</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium text-slate-600">No students found matching filters.</p>
                    <p className="text-xs text-slate-400 mt-1">Try resetting search filters or click "Add Student".</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const hasDescriptor = Boolean(
                    student.descriptor &&
                      (Array.isArray(student.descriptor)
                        ? student.descriptor.length === 128
                        : Object.keys(student.descriptor).length === 128)
                  );

                  return (
                    <tr key={student.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Photo & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {student.photoUrl ? (
                            <img
                              src={student.photoUrl}
                              alt={student.name}
                              className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-slate-100"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs border border-amber-200">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-slate-900 leading-tight">{student.name}</div>
                            <div className="text-[10px] text-slate-400">Added {new Date(student.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600">
                        {student.studentId}
                      </td>

                      {/* Department & Course */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{student.department || "Computer Science"}</div>
                        <div className="text-[11px] text-indigo-600 font-medium">{student.course || student.class || "B.Tech"}</div>
                      </td>

                      {/* Branch / Sec / Group */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            {student.branch || "CSE"} - {student.section || "A"}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Grp {student.group || "G1"}
                          </span>
                        </div>
                      </td>

                      {/* Biometric Status */}
                      <td className="py-3 px-4">
                        {hasDescriptor ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            128D Face &amp; Eye Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Missing Biometrics
                          </span>
                        )}
                      </td>

                      {/* Action: Edit + Delete */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditStudent && onEditStudent(student)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Student Credentials & Photo"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDelete(student.id, student.name)}
                            disabled={deletingId === student.id}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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

