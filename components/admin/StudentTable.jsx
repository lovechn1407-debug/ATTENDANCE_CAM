"use client";

import React, { useState } from "react";
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
  Users
} from "lucide-react";
import { deleteStudent } from "@/lib/firebase";

export default function StudentTable({ students, onOpenAddModal, onOpenBulkModal }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [groupFilter, setGroupFilter] = useState("ALL");
  const [deletingId, setDeletingId] = useState(null);

  // Extract unique classes
  const availableClasses = Array.from(
    new Set(students.map((s) => s.class).filter(Boolean))
  ).sort();

  // Filter students logic
  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.class.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.section.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = classFilter === "ALL" || student.class === classFilter;
    const matchesGroup = groupFilter === "ALL" || student.group === groupFilter;

    return matchesSearch && matchesClass && matchesGroup;
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
    <div className="space-y-6">
      {/* Top Banner & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" /> Master Student Database
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Total Enrolled: <span className="font-semibold text-slate-800">{students.length}</span> students across classes & groups.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenBulkModal}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-sm flex items-center gap-2 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Bulk CSV Upload</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, ID, Class..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-xs text-slate-500 font-medium">Class:</span>
            <select
              value={classFilter}
              onChange={(e) => setClassFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Classes</option>
              {availableClasses.map((cls) => (
                <option key={cls} value={cls}>Class {cls}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            <span className="text-xs text-slate-500 font-medium">Group:</span>
            <select
              value={groupFilter}
              onChange={(e) => setGroupFilter(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Groups</option>
              <option value="A">Group A</option>
              <option value="B">Group B</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-[12px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Info</th>
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Class & Sec</th>
                <th className="py-3.5 px-4">Group</th>
                <th className="py-3.5 px-4">Biometric Descriptor</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
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
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-sm border border-indigo-200">
                              {student.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-slate-900 leading-tight">{student.name}</div>
                            <div className="text-xs text-slate-400">Added {new Date(student.createdAt).toLocaleDateString()}</div>
                          </div>
                        </div>
                      </td>

                      {/* ID */}
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-600">
                        {student.studentId}
                      </td>

                      {/* Class & Sec */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          Class {student.class} - {student.section}
                        </span>
                      </td>

                      {/* Group */}
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          student.group === "A"
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "bg-purple-50 text-purple-700 border border-purple-200"
                        }`}>
                          Group {student.group}
                        </span>
                      </td>

                      {/* Biometric Status */}
                      <td className="py-3 px-4">
                        {hasDescriptor ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            128D Face & Eye Ready
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            Missing Biometrics
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleDelete(student.id, student.name)}
                          disabled={deletingId === student.id}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
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
