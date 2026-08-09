"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  Upload, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  Hash, 
  School, 
  Group as GroupIcon,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Edit
} from "lucide-react";

const POSES = [
  { step: 0, id: "center", label: "Pose 1: Look Center", subtitle: "Align face straight looking at camera" },
  { step: 1, id: "left",   label: "Pose 2: Turn Left",   subtitle: "Turn head slightly to your left" },
  { step: 2, id: "right",  label: "Pose 3: Turn Right",  subtitle: "Turn head slightly to your right" }
];

export default function AddStudentModal({ isOpen, onClose, onStartRegistration, studentToEdit = null }) {
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("10");
  const [section, setSection] = useState("A");
  const [group, setGroup] = useState("A");

  // Multi-Side Pose Photos State { center: null, left: null, right: null }
  const [capturedPoses, setCapturedPoses] = useState({ center: null, left: null, right: null });
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [useCameraMode, setUseCameraMode] = useState(false);
  const [activeUploadPoseTarget, setActiveUploadPoseTarget] = useState("ALL"); // ALL | center | left | right
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Stop Webcam Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCameraMode(false);
  };

  // Initialize form state when opening or switching studentToEdit
  useEffect(() => {
    if (isOpen) {
      if (studentToEdit) {
        setStudentId(studentToEdit.studentId || studentToEdit.id);
        setName(studentToEdit.name || "");
        setStudentClass(studentToEdit.class || "10");
        setSection(studentToEdit.section || "A");
        setGroup(studentToEdit.group || "A");
        const existingPhoto = studentToEdit.photoUrl || null;
        setCapturedPoses({
          center: existingPhoto,
          left: existingPhoto,
          right: existingPhoto
        });
      } else {
        setStudentId(`STU_${Math.floor(100000 + Math.random() * 900000)}`);
        setName("");
        setStudentClass("10");
        setSection("A");
        setGroup("A");
        setCapturedPoses({ center: null, left: null, right: null });
      }
      setCurrentPoseIndex(0);
      setUseCameraMode(false);
      setErrorMessage("");
    }
  }, [isOpen, studentToEdit]);

  if (!isOpen) return null;

  // Handle Image File Upload (Target pose specific or ALL)
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target.result;
        if (activeUploadPoseTarget === "ALL") {
          setCapturedPoses({ center: src, left: src, right: src });
        } else {
          setCapturedPoses(prev => ({ ...prev, [activeUploadPoseTarget]: src }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerUploadForPose = (poseId) => {
    setActiveUploadPoseTarget(poseId);
    fileInputRef.current?.click();
  };

  // Start Live Webcam Stream (3:4 ratio)
  const startCamera = async () => {
    setUseCameraMode(true);
    setErrorMessage("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 480 }, height: { ideal: 640 }, facingMode: "user" } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      setErrorMessage("Could not access camera: " + err.message);
      setUseCameraMode(false);
    }
  };

  // Capture Snapshot for Current Pose Step
  const captureCurrentPose = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const poseKey = POSES[currentPoseIndex].id;

    setCapturedPoses(prev => ({ ...prev, [poseKey]: dataUrl }));

    if (currentPoseIndex < POSES.length - 1) {
      setCurrentPoseIndex(prev => prev + 1);
    } else {
      stopCamera();
    }
  };

  const handleRetakePoses = () => {
    setCapturedPoses({ center: null, left: null, right: null });
    setCurrentPoseIndex(0);
    startCamera();
  };

  // Form Submit Handler -> Closes modal and starts background processing snackbar
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter the student's name.");
      return;
    }
    if (!capturedPoses.center) {
      setErrorMessage("Please capture or upload face photos.");
      return;
    }

    const payload = {
      studentId: studentId.trim(),
      name: name.trim(),
      studentClass: studentClass.trim(),
      section: section.trim(),
      group: group.trim(),
      photos: [
        capturedPoses.center,
        capturedPoses.left || capturedPoses.center,
        capturedPoses.right || capturedPoses.center
      ]
    };

    stopCamera();
    onClose();

    if (onStartRegistration) {
      onStartRegistration(payload);
    }
  };

  const currentPose = POSES[currentPoseIndex];
  const isAllPosesCaptured = !!(capturedPoses.center && capturedPoses.left && capturedPoses.right);
  const isEditMode = Boolean(studentToEdit);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              {isEditMode ? <Edit className="w-5 h-5 text-indigo-600" /> : <User className="w-5 h-5 text-indigo-600" />}
              {isEditMode ? "Edit Student & Re-upload Photo" : "Add New Student Record"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditMode ? "Modify student credentials and update biometric reference photos" : "Multi-angle biometric pose capture & background processing"}
            </p>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Student Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" /> Student ID
              </label>
              <input
                type="text"
                required
                readOnly={isEditMode}
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className={`w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${isEditMode ? "bg-slate-100 text-slate-500 cursor-not-allowed" : ""}`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" /> Class &amp; Section
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Class (10)"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Sec (A)"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-24 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <GroupIcon className="w-3.5 h-3.5 text-slate-400" /> Group Selector
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="A">Group A</option>
                <option value="B">Group B</option>
              </select>
            </div>
          </div>

          {/* Photo & Multi-Angle Pose Section */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Face Reference Photos (Live 3-Pose or 3 File Uploads)</span>
              {isAllPosesCaptured && (
                <span className="text-emerald-600 font-bold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 3 Pose Photos Ready
                </span>
              )}
            </label>

            {useCameraMode ? (
              <div className="space-y-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                      {currentPose.label}
                    </div>
                    <div className="text-[11px] text-indigo-600">
                      {currentPose.subtitle}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {POSES.map((p, idx) => (
                      <span
                        key={p.id}
                        className={`w-2.5 h-2.5 rounded-full ${
                          idx === currentPoseIndex
                            ? "bg-indigo-600 animate-pulse"
                            : capturedPoses[p.id]
                            ? "bg-emerald-500"
                            : "bg-slate-300"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* 3:4 Aspect Ratio Camera Box */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 aspect-[3/4] max-w-[260px] mx-auto flex items-center justify-center shadow-lg">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover -scale-x-100" 
                  />

                  <div className="absolute inset-4 border-2 border-dashed border-white/40 rounded-[40px] pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] font-bold text-white/80 bg-black/60 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
                      {currentPose.id.toUpperCase()} FACE ALIGNMENT
                    </span>
                  </div>

                  <div className="absolute bottom-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={captureCurrentPose}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95"
                    >
                      <Camera className="w-4 h-4" />
                      <span>{currentPoseIndex < 2 ? "Capture & Next" : "Capture Final Pose"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className="px-3 py-2 bg-slate-800/80 text-white font-semibold text-xs rounded-xl backdrop-blur-xs"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : capturedPoses.center ? (
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                {/* 3 Pose Badges with Individual Re-Upload Triggers */}
                <div className="grid grid-cols-3 gap-3">
                  {POSES.map((p) => {
                    const imgData = capturedPoses[p.id];
                    return (
                      <div key={p.id} className="space-y-1.5 text-center">
                        <div className="aspect-[3/4] rounded-xl bg-slate-900 overflow-hidden border border-slate-300 relative shadow-sm group">
                          {imgData ? (
                            <img src={imgData} alt={p.label} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px]">
                              Pending
                            </div>
                          )}
                          <span className="absolute bottom-1 left-1 right-1 bg-black/70 backdrop-blur-xs text-white text-[9px] font-bold uppercase rounded py-0.5 truncate">
                            {p.id}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => triggerUploadForPose(p.id)}
                          className="text-[10px] text-indigo-600 hover:underline font-semibold block w-full truncate"
                        >
                          Upload {p.id}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500 font-medium">3 Pose Snapshots Captured</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleRetakePoses}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> Re-take 3 Poses
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={startCamera}
                    className="p-5 border-2 border-indigo-500/40 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-indigo-600 mb-1.5 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-extrabold text-slate-900">Take 3-Pose Camera Photos</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">3:4 Ratio (Center, Left, Right)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerUploadForPose("ALL")}
                    className="p-5 border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-100/50 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-700 mb-1.5" />
                    <span className="text-xs font-semibold text-slate-700">Quick Upload 1 Image</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Populates all 3 pose angles</span>
                  </button>
                </div>

                {/* Individual 3 Pose Upload Buttons */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Or Upload 3 Individual Pose Images:
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {POSES.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => triggerUploadForPose(p.id)}
                        className="p-2.5 bg-white hover:bg-indigo-50 border border-slate-200 rounded-xl text-center text-xs font-semibold text-slate-700 hover:border-indigo-300 transition-all flex flex-col items-center gap-1"
                      >
                        <Upload className="w-3.5 h-3.5 text-indigo-600" />
                        <span className="capitalize text-[10px]">{p.id} Pose</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400 font-medium">
              * Background processing status in snackbar
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!capturedPoses.center}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isEditMode ? "Update & Process Background" : "Save & Process Background"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
