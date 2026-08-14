"use client";

import React, { useState, useEffect } from "react";
import { 
  Sliders, 
  Plus, 
  X, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  BookOpen, 
  GraduationCap, 
  Building2, 
  GitBranch, 
  Layers, 
  Sparkles,
  Info
} from "lucide-react";
import { 
  subscribeToAcademicSettings, 
  updateAcademicSettings, 
  resetAcademicSettings, 
  DEFAULT_ACADEMIC_SETTINGS 
} from "@/lib/firebase";

export default function AcademicSettings() {
  const [settings, setSettings] = useState(DEFAULT_ACADEMIC_SETTINGS);
  const [activeCategory, setActiveCategory] = useState("courses"); // "courses" | "departments" | "branches" | "sections" | "subjects"
  const [newOptionInput, setNewOptionInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAcademicSettings((data) => {
      if (data) {
        setSettings(data);
      }
    });
    return () => unsubscribe();
  }, []);

  const categories = [
    {
      id: "courses",
      label: "Courses / Degrees",
      icon: GraduationCap,
      description: "Available degree programs (e.g. B.Tech, M.Tech, BCA)",
      color: "indigo"
    },
    {
      id: "departments",
      label: "Departments",
      icon: Building2,
      description: "Academic departments (e.g. Computer Science, Mechanical)",
      color: "blue"
    },
    {
      id: "branches",
      label: "Branches / Specializations",
      icon: GitBranch,
      description: "Engineering branches or study tracks (e.g. CSE, IT, ECE)",
      color: "emerald"
    },
    {
      id: "sections",
      label: "Class Sections",
      icon: Layers,
      description: "Student section designations (e.g. A, B, C, 1, 2)",
      color: "amber"
    },
    {
      id: "subjects",
      label: "Subjects & Curriculum",
      icon: BookOpen,
      description: "Course subjects available for faculty allotments & logs",
      color: "purple"
    }
  ];

  const handleAddOption = (e) => {
    e?.preventDefault();
    const val = newOptionInput.trim();
    if (!val) return;

    const currentList = settings[activeCategory] || [];
    if (currentList.some(item => item.toLowerCase() === val.toLowerCase())) {
      alert(`"${val}" is already added in ${activeCategory}.`);
      return;
    }

    setSettings(prev => ({
      ...prev,
      [activeCategory]: [...currentList, val]
    }));
    setNewOptionInput("");
  };

  const handleRemoveOption = (categoryKey, optionToRemove) => {
    setSettings(prev => ({
      ...prev,
      [categoryKey]: (prev[categoryKey] || []).filter(item => item !== optionToRemove)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAcademicSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      alert("Failed to save settings: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefaults = async () => {
    if (confirm("Reset all academic categories to default system presets? Custom additions will be cleared.")) {
      setResetting(true);
      try {
        await resetAcademicSettings();
        setSettings(DEFAULT_ACADEMIC_SETTINGS);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } catch (err) {
        alert("Failed to reset: " + err.message);
      } finally {
        setResetting(false);
      }
    }
  };

  const currentCategoryObj = categories.find(c => c.id === activeCategory) || categories[0];

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner & Actions Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200 shrink-0">
            <Sliders className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Academic Dropdown Structure Settings
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                System Master
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure pre-populated dropdown values for courses, subjects, departments, branches, and sections. Standardized across all forms.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            disabled={resetting || saving}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all border border-slate-200 flex items-center gap-2 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>Saved & Synced!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? "Saving Changes..." : "Save All Changes"}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Info Callout */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs font-medium">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          Adding or removing items here will update form dropdowns across <strong>Add Student</strong>, <strong>Faculty Allotments</strong>, <strong>Class Datasets</strong>, and <strong>Attendance Filters</strong>. No manual comma-separated typing required!
        </div>
      </div>

      {/* Main Grid: Category Selection Sidebar + Option Management Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Category Switcher Tabs */}
        <div className="md:col-span-4 space-y-2">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            const itemCount = (settings[cat.id] || []).length;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  setNewOptionInput("");
                }}
                className={`w-full text-left p-4 rounded-2xl transition-all duration-200 border flex items-center justify-between group ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl ${
                    isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-extrabold text-sm leading-tight">{cat.label}</div>
                    <div className={`text-[11px] mt-0.5 line-clamp-1 ${isActive ? "text-indigo-100" : "text-slate-400"}`}>
                      {cat.description}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {itemCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Option Management Panel */}
        <div className="md:col-span-8 bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            {/* Category Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  {React.createElement(currentCategoryObj.icon, { className: "w-5 h-5" })}
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Manage {currentCategoryObj.label}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Add or remove items available in dropdown options.
                  </p>
                </div>
              </div>

              <span className="text-xs font-semibold text-slate-500">
                {(settings[activeCategory] || []).length} Options
              </span>
            </div>

            {/* Quick Add Form Input */}
            <form onSubmit={handleAddOption} className="mt-5 mb-6 flex gap-2">
              <input
                type="text"
                value={newOptionInput}
                onChange={(e) => setNewOptionInput(e.target.value)}
                placeholder={`Add new ${currentCategoryObj.label.toLowerCase()} option...`}
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
              />
              <button
                type="submit"
                disabled={!newOptionInput.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-100 flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>Add Option</span>
              </button>
            </form>

            {/* Tags / Pills Display Grid */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Active Options List:</span>
                <span>Click × to remove</span>
              </div>

              {(settings[activeCategory] || []).length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                  No options in this category. Type above to add your first option!
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5 pt-1 max-h-80 overflow-y-auto p-1">
                  {(settings[activeCategory] || []).map((item, idx) => (
                    <div
                      key={idx}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200/80 border border-slate-200/80 rounded-xl text-xs font-semibold text-slate-800 flex items-center gap-2 group transition-all"
                    >
                      <span>{item}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(activeCategory, item)}
                        className="w-4 h-4 rounded-full bg-slate-200 group-hover:bg-red-500 group-hover:text-white text-slate-500 flex items-center justify-center transition-colors"
                        title={`Remove ${item}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Card Summary */}
          <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Realtime Synced with Firebase RTDB
            </span>
            <span>
              Last updated: {settings.updatedAt ? new Date(settings.updatedAt).toLocaleTimeString() : "Default presets"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
