"use client";

import React, { useState } from "react";
import { 
  Sliders, 
  Plus, 
  Clock, 
  Check, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  CheckSquare, 
  Square,
  AlertCircle,
  Sparkles,
  Layers
} from "lucide-react";
import { saveDataset, toggleDatasetActive, deleteDataset } from "@/lib/firebase";

export default function DatasetManager({ datasets, students }) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  
  // Dynamic filter choices from student list
  const availableClasses = Array.from(new Set(students.map(s => s.class).filter(Boolean))).sort();
  const availableSections = Array.from(new Set(students.map(s => s.section).filter(Boolean))).sort();
  const availableGroups = ["A", "B"];

  // Selected filters
  const [selectedClasses, setSelectedClasses] = useState(availableClasses);
  const [selectedSections, setSelectedSections] = useState(availableSections);
  const [selectedGroups, setSelectedGroups] = useState(availableGroups);

  // Timings
  const [entryTime, setEntryTime] = useState("08:00");
  const [maxEntryTime, setMaxEntryTime] = useState("09:30");
  const [exitTime, setExitTime] = useState("16:00");
  const [exitEnabled, setExitEnabled] = useState(true);

  const [saving, setSaving] = useState(false);

  // Toggle Checkbox Helpers
  const toggleItem = (list, setList, item) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleCreateDataset = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Please give this dataset a title.");
      return;
    }
    if (selectedClasses.length === 0 || selectedSections.length === 0 || selectedGroups.length === 0) {
      alert("Please select at least one Class, Section, and Group filter.");
      return;
    }

    setSaving(true);
    try {
      await saveDataset({
        name: name.trim(),
        classes: selectedClasses,
        sections: selectedSections,
        groups: selectedGroups,
        timing: {
          entryTime,
          maxEntryTime,
          exitTime,
          exitEnabled
        },
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
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" /> Entry / Exit Configuration Datasets
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create target groups and configure entry windows, late cutoffs, and exit times.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(!isCreating)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm flex items-center gap-2 shadow-sm shadow-indigo-200 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{isCreating ? "Cancel Generator" : "New Dataset Filter"}</span>
        </button>
      </div>

      {/* Dataset Creation Form */}
      {isCreating && (
        <form onSubmit={handleCreateDataset} className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-md space-y-6 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Create Custom Dataset & Timing Rule
            </h3>
            <span className="text-xs text-slate-400 font-medium">Filter Master Database</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Dataset Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Class 10 Morning Shift (Group A)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Bulk Checkbox Selector Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/60 p-4 rounded-xl border border-slate-200">
            {/* Class Checkboxes */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                Filter by Class
              </div>
              <div className="space-y-1.5">
                {availableClasses.length === 0 ? (
                  <div className="text-xs text-slate-400">No classes in database yet</div>
                ) : (
                  availableClasses.map((cls) => {
                    const checked = selectedClasses.includes(cls);
                    return (
                      <label key={cls} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(selectedClasses, setSelectedClasses, cls)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Class {cls}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Section Checkboxes */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                Filter by Section
              </div>
              <div className="space-y-1.5">
                {availableSections.length === 0 ? (
                  <div className="text-xs text-slate-400">No sections in database yet</div>
                ) : (
                  availableSections.map((sec) => {
                    const checked = selectedSections.includes(sec);
                    return (
                      <label key={sec} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleItem(selectedSections, setSelectedSections, sec)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                        <span>Section {sec}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            {/* Group Checkboxes */}
            <div>
              <div className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                Filter by Group
              </div>
              <div className="space-y-1.5">
                {availableGroups.map((grp) => {
                  const checked = selectedGroups.includes(grp);
                  return (
                    <label key={grp} className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(selectedGroups, setSelectedGroups, grp)}
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span>Group {grp}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Timing Configuration Grid */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-600" /> Timing Configuration (Entry & Exit Windows)
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entry Start Time
                </label>
                <input
                  type="time"
                  required
                  value={entryTime}
                  onChange={(e) => setEntryTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Max Entry Cutoff Time
                </label>
                <input
                  type="time"
                  required
                  value={maxEntryTime}
                  onChange={(e) => setMaxEntryTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">
                    Exit Scanner Time
                  </label>
                  <label className="flex items-center gap-1 text-[11px] font-medium text-slate-500 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={exitEnabled}
                      onChange={(e) => setExitEnabled(e.target.checked)}
                      className="rounded text-indigo-600 w-3.5 h-3.5"
                    />
                    Enable Exit
                  </label>
                </div>
                <input
                  type="time"
                  disabled={!exitEnabled}
                  value={exitTime}
                  onChange={(e) => setExitTime(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 disabled:opacity-40"
                />
              </div>
            </div>
          </div>

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
              {saving ? "Saving..." : "Save & Activate Dataset"}
            </button>
          </div>
        </form>
      )}

      {/* Dataset Cards List */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Layers className="w-4 h-4 text-indigo-600" /> Active & Configured Datasets ({datasets.length})
        </h3>

        {datasets.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-600">No Datasets Created Yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Click "New Dataset Filter" above to filter students and define attendance rules.
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
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base leading-snug">{dataset.name}</h4>
                    <span className="text-[11px] text-slate-400">
                      Created {new Date(dataset.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Toggle Active Switch */}
                  <button
                    onClick={() => handleToggleActive(dataset.id, dataset.active)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      dataset.active
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-xs"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                  >
                    {dataset.active ? (
                      <>
                        <ToggleRight className="w-5 h-5 text-emerald-600" />
                        <span>ACTIVE (ON)</span>
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5 text-slate-400" />
                        <span>INACTIVE</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Filter Tags */}
                <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold">Classes:</span>
                    {dataset.classes?.map((c) => (
                      <span key={c} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">Class {c}</span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold">Sections:</span>
                    {dataset.sections?.map((s) => (
                      <span key={s} className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium text-slate-700">Sec {s}</span>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-slate-400 font-semibold">Groups:</span>
                    {dataset.groups?.map((g) => (
                      <span key={g} className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded border border-indigo-200">Group {g}</span>
                    ))}
                  </div>
                </div>

                {/* Timings */}
                <div className="grid grid-cols-3 gap-2 text-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 mb-4 text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Entry Start</div>
                    <div className="font-bold text-slate-800 mt-0.5">{dataset.timing?.entryTime || "08:00"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Max Entry</div>
                    <div className="font-bold text-indigo-700 mt-0.5">{dataset.timing?.maxEntryTime || "09:30"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium uppercase">Exit Time</div>
                    <div className="font-bold text-slate-800 mt-0.5">
                      {dataset.timing?.exitEnabled ? dataset.timing?.exitTime : "Disabled"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                  <span className="text-slate-500">
                    {dataset.active ? "Enforcing scanner rules" : "Disabled in scanner"}
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
