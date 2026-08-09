"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";
import { subscribeToStaffs, saveStaff, deleteStaff } from "@/lib/firebase";

export default function StaffManager({ datasets = [] }) {
  const [staffs, setStaffs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  // Form states
  const [staffId, setStaffId] = useState("");
  const [staffName, setStaffName] = useState("");
  const [password, setPassword] = useState("");
  const [selectedDatasetIds, setSelectedDatasetIds] = useState([]);
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Realtime subscription to staffs list
  useEffect(() => {
    const unsub = subscribeToStaffs(setStaffs);
    return () => unsub();
  }, []);

  const handleOpenAddModal = () => {
    setEditingStaff(null);
    setStaffId("");
    setStaffName("");
    setPassword("");
    setSelectedDatasetIds([]);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (staff) => {
    setEditingStaff(staff);
    setStaffId(staff.staffId || staff.id);
    setStaffName(staff.name || "");
    setPassword(staff.password || "");
    setSelectedDatasetIds(staff.assignedDatasets || []);
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleToggleDatasetSelection = (datasetId) => {
    setSelectedDatasetIds((prev) =>
      prev.includes(datasetId)
        ? prev.filter((id) => id !== datasetId)
        : [...prev, datasetId]
    );
  };

  const handleSelectAllDatasets = () => {
    if (selectedDatasetIds.length === datasets.length) {
      setSelectedDatasetIds([]);
    } else {
      setSelectedDatasetIds(datasets.map((d) => d.id));
    }
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
      await saveStaff({
        staffId: staffId.trim().toUpperCase(),
        name: staffName.trim(),
        password: password.trim(),
        assignedDatasets: selectedDatasetIds
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

  const filteredStaffs = staffs.filter(
    (s) =>
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.staffId && s.staffId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" /> Staff Accounts &amp; Dataset Access
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create staff credentials and assign single or multiple attendance datasets for manual verification &amp; edits.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm rounded-xl shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Staff</span>
        </button>
      </div>

      {/* Search Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff by Name or Staff ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500 px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200">
          Total Staffs: {staffs.length}
        </span>
      </div>

      {/* Staff Cards Grid */}
      {filteredStaffs.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
          <UserCheck className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Staff Accounts Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Add New Staff" above to create credentials and assign datasets to your staff.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStaffs.map((staff) => {
            const sId = staff.staffId || staff.id;
            const assignedIds = staff.assignedDatasets || [];
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
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(staff)}
                        className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Edit Staff Account"
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

                  {/* Assigned Datasets section */}
                  <div className="mt-4 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Assigned Datasets ({assignedIds.length})</span>
                    </div>

                    {assignedIds.length === 0 ? (
                      <span className="inline-block text-xs text-amber-600 italic bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        No datasets assigned yet
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {assignedIds.map((dId) => {
                          const matchedDs = datasets.find((d) => d.id === dId);
                          const dsName = matchedDs ? matchedDs.name : dId;
                          return (
                            <span
                              key={dId}
                              className="px-2.5 py-1 bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 truncate max-w-[200px]"
                              title={dsName}
                            >
                              {dsName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Created: {new Date(staff.createdAt || Date.now()).toLocaleDateString()}</span>
                  <span className="text-indigo-600 font-sans font-bold">Authorized</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT STAFF MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200">
            {/* Modal Title */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">
                    {editingStaff ? "Edit Staff Account" : "Create New Staff Account"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign Staff ID, password &amp; dataset permissions
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
                  Staff Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Smith"
                  value={staffName}
                  onChange={(e) => setStaffName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Staff Login Password *
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

              {/* Datasets Checklist (Assign 1 or More Datasets) */}
              <div className="space-y-2 pt-2 border-t border-slate-150">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Assign Datasets (Select 1 or More)
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllDatasets}
                    className="text-xs text-indigo-600 font-bold hover:underline"
                  >
                    {selectedDatasetIds.length === datasets.length ? "Deselect All" : "Select All"}
                  </button>
                </div>

                {datasets.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No datasets created in Admin yet.</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    {datasets.map((d) => {
                      const isSelected = selectedDatasetIds.includes(d.id);
                      return (
                        <div
                          key={d.id}
                          onClick={() => handleToggleDatasetSelection(d.id)}
                          className={`p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold cursor-pointer transition-all ${
                            isSelected
                              ? "bg-indigo-50 text-indigo-900 border border-indigo-200 shadow-2xs"
                              : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-150"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300 shrink-0" />
                            )}
                            <span className="truncate">{d.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {d.classes?.length ? `${d.classes.length} classes` : "Custom"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
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
                  {isSubmitting ? "Saving..." : editingStaff ? "Update Staff" : "Create Staff Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
