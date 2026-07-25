"use client";

import React, { useState, useRef } from "react";
import { 
  X, 
  FileSpreadsheet, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Users,
  Download
} from "lucide-react";
import { parseStudentsCSV } from "@/lib/csvParser";
import { bulkAddStudents } from "@/lib/firebase";

export default function BulkUploadModal({ isOpen, onClose }) {
  const [parsedStudents, setParsedStudents] = useState([]);
  const [fileName, setFileName] = useState("");
  const [isParsing, setIsParsing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successCount, setSuccessCount] = useState(null);

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setErrorMessage("");
    setSuccessCount(null);

    try {
      const data = await parseStudentsCSV(file);
      if (data.length === 0) {
        setErrorMessage("CSV file appears to be empty or missing headers.");
        setParsedStudents([]);
      } else {
        setParsedStudents(data);
      }
    } catch (err) {
      setErrorMessage("Error parsing CSV: " + err.message);
      setParsedStudents([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleBulkSubmit = async () => {
    if (parsedStudents.length === 0) return;

    setIsUploading(true);
    setErrorMessage("");

    try {
      await bulkAddStudents(parsedStudents);
      setSuccessCount(parsedStudents.length);
      setTimeout(() => {
        setIsUploading(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error("Bulk upload error:", err);
      setErrorMessage("Failed to upload students to Firebase: " + err.message);
      setIsUploading(false);
    }
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `studentId,name,class,section,group,photoUrl
STU_1001,John Doe,10,A,A,https://i.ibb.co/sample1.jpg
STU_1002,Jane Smith,10,A,B,https://i.ibb.co/sample2.jpg
STU_1003,Robert Brown,11,B,A,https://i.ibb.co/sample3.jpg`;

    const blob = new Blob([sampleCSV], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "student_master_template.csv";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-600" /> Bulk CSV Student Import
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a CSV file to populate the master student database in Firebase Realtime DB
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successCount !== null && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Successfully imported {successCount} students into Firebase Master List!</span>
            </div>
          )}

          {/* Sample CSV Download Bar */}
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                CSV
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-800">Need the standard CSV layout?</div>
                <div className="text-[11px] text-slate-500">Download sample template with pre-formatted headers.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadSampleCSV}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Sample CSV
            </button>
          </div>

          {/* Upload Area */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-8 border-2 border-dashed border-slate-200 hover:border-emerald-500/50 hover:bg-emerald-50/20 rounded-2xl flex flex-col items-center justify-center text-center transition-all cursor-pointer group"
          >
            <Upload className="w-8 h-8 text-slate-400 group-hover:text-emerald-600 mb-2" />
            <span className="text-sm font-semibold text-slate-800">
              {fileName ? fileName : "Click to select CSV file"}
            </span>
            <span className="text-xs text-slate-400 mt-1">Supports UTF-8 .csv files</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv, text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Parsed Students Table Preview */}
          {isParsing ? (
            <div className="py-8 text-center text-indigo-600 text-xs font-medium flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Parsing CSV rows...
            </div>
          ) : parsedStudents.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span>Preview Ready ({parsedStudents.length} Students)</span>
                <span className="text-slate-400 font-normal">Review first 5 records</span>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Name</th>
                      <th className="p-2.5">Class</th>
                      <th className="p-2.5">Sec</th>
                      <th className="p-2.5">Group</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {parsedStudents.slice(0, 5).map((s, idx) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-mono text-[11px] font-semibold">{s.studentId}</td>
                        <td className="p-2.5 font-medium text-slate-900">{s.name}</td>
                        <td className="p-2.5">{s.class}</td>
                        <td className="p-2.5">{s.section}</td>
                        <td className="p-2.5 font-semibold text-indigo-600">Group {s.group}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleBulkSubmit}
            disabled={parsedStudents.length === 0 || isUploading}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-md shadow-emerald-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Uploading to Firebase...
              </>
            ) : (
              <>
                <Users className="w-4 h-4" /> Import {parsedStudents.length} Students
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
