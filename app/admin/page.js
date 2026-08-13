"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "@/components/admin/Sidebar";
import StudentTable from "@/components/admin/StudentTable";
import AddStudentModal from "@/components/admin/AddStudentModal";
import BulkUploadModal from "@/components/admin/BulkUploadModal";
import UpdatePhotosModal from "@/components/admin/UpdatePhotosModal";
import DatasetManager from "@/components/admin/DatasetManager";
import AttendanceRecords from "@/components/admin/AttendanceRecords";
import StaffManager from "@/components/admin/StaffManager";
import SuspensionList from "@/components/admin/SuspensionList";
import CameraConfig from "@/components/admin/CameraConfig";
import RegistrationSnackbar from "@/components/admin/RegistrationSnackbar";
import { subscribeToStudents, subscribeToDatasets, subscribeToStaffs, triggerScreenReload } from "@/lib/firebase";
import { Clock, RefreshCw, CheckCircle2, Loader2 } from "lucide-react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("students"); // "students" | "datasets" | "attendance" | "suspension" | "staff" | "camera"
  const [students, setStudents] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isUpdatePhotosModalOpen, setIsUpdatePhotosModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState(null);

  const [currentTime, setCurrentTime] = useState("");
  const [isUpdatingScreen, setIsUpdatingScreen] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  // Background Registration Jobs Queue
  const [registrationQueue, setRegistrationQueue] = useState([]);

  // Realtime Subscriptions
  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubDatasets = subscribeToDatasets(setDatasets);
    const unsubStaffs = subscribeToStaffs(setStaffs);

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    return () => {
      unsubStudents();
      unsubDatasets();
      unsubStaffs();
      clearInterval(timer);
    };
  }, []);

  const handleUpdateScreen = async () => {
    setIsUpdatingScreen(true);
    try {
      await triggerScreenReload();
      setUpdateSuccess(true);
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      alert("Failed to trigger screen update: " + err.message);
    } finally {
      setIsUpdatingScreen(false);
    }
  };

  const handleStartRegistration = (studentPayload) => {
    const newJob = {
      id: Date.now(),
      ...studentPayload,
      progress: 10,
      status: "processing"
    };
    setRegistrationQueue(prev => [...prev, newJob]);
  };

  const handleDismissJob = (jobId) => {
    setRegistrationQueue(prev => prev.filter(j => j.id !== jobId));
  };

  const handleOpenAddModal = () => {
    setStudentToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleEditStudent = (student) => {
    setStudentToEdit(student);
    setIsAddModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      {/* Navigation Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Admin Content Container */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200 px-8 py-4 sticky top-0 z-10 flex items-center justify-between shadow-xs">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {activeTab === "students" && "Student Master Database"}
              {activeTab === "datasets" && "College Class Datasets & Subjects"}
              {activeTab === "attendance" && "Attendance Records & Period-Wise Results"}
              {activeTab === "suspension" && "Student Suspension Management"}
              {activeTab === "staff" && "Faculty Accounts & Subject Category"}
              {activeTab === "camera" && "Hardware Camera & Biometrics"}
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Firebase Realtime Database Synced • Active System
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Update Screen Button */}
            <button
              onClick={handleUpdateScreen}
              disabled={isUpdatingScreen}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 transition-all disabled:opacity-50"
              title="Force reload all active screening panels with progress bar"
            >
              {isUpdatingScreen ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending Update Signal...</span>
                </>
              ) : updateSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Update Signal Sent!</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Update Screen</span>
                </>
              )}
            </button>

            <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 rounded-xl text-slate-700 font-mono text-xs font-semibold border border-slate-200">
              <Clock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{currentTime || "00:00:00 AM"}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Database Connected</span>
            </div>
          </div>
        </header>

        {/* Dynamic View Body */}
        <main className="p-8 flex-1">
          {activeTab === "students" && (
            <StudentTable
              students={students}
              onOpenAddModal={handleOpenAddModal}
              onOpenBulkModal={() => setIsBulkModalOpen(true)}
              onOpenUpdatePhotosModal={() => setIsUpdatePhotosModalOpen(true)}
              onEditStudent={handleEditStudent}
            />
          )}

          {activeTab === "datasets" && (
            <DatasetManager datasets={datasets} students={students} staffs={staffs} />
          )}

          {activeTab === "attendance" && (
            <AttendanceRecords datasets={datasets} students={students} />
          )}

          {activeTab === "suspension" && (
            <SuspensionList students={students} />
          )}

          {activeTab === "staff" && (
            <StaffManager datasets={datasets} />
          )}

          {activeTab === "camera" && <CameraConfig />}
        </main>
      </div>

      {/* Modals */}
      <AddStudentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setStudentToEdit(null);
        }}
        onStartRegistration={handleStartRegistration}
        studentToEdit={studentToEdit}
      />

      <BulkUploadModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
      />

      <UpdatePhotosModal
        isOpen={isUpdatePhotosModalOpen}
        onClose={() => setIsUpdatePhotosModalOpen(false)}
        students={students}
        onStartRegistration={handleStartRegistration}
      />

      {/* Bottom-Right Floating Progress Snackbar for Background Registration */}
      <RegistrationSnackbar
        jobs={registrationQueue}
        onDismissJob={handleDismissJob}
      />
    </div>
  );
}
