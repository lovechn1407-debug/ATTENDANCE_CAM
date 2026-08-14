"use client";

import React, { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
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
  Edit,
  QrCode,
  Smartphone,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import { createMobileCaptureSession, subscribeToMobileCaptureSession, deleteMobileCaptureSession } from "@/lib/firebase";

const POSES = [
  { step: 0, id: "center", label: "Pose 1: Look Center", subtitle: "Align face straight looking at camera" },
  { step: 1, id: "left",   label: "Pose 2: Turn Left",   subtitle: "Turn head slightly to your left" },
  { step: 2, id: "right",  label: "Pose 3: Turn Right",  subtitle: "Turn head slightly to your right" }
];

export default function AddStudentModal({ isOpen, onClose, onStartRegistration, studentToEdit = null, academicSettings = null }) {
  const deptsList = academicSettings?.departments || ["Computer Science", "Information Technology", "Electronics & Comm", "Mechanical Engineering", "Electrical Engineering", "Civil Engineering"];
  const coursesList = academicSettings?.courses || ["B.Tech", "M.Tech", "BCA", "MCA", "B.Sc", "M.Sc", "MBA", "BBA"];
  const branchesList = academicSettings?.branches || ["CSE", "IT", "ECE", "ME", "EE", "CE", "AI/ML", "Data Science"];
  const sectionsList = academicSettings?.sections || ["A", "B", "C", "D", "1", "2"];
  const availableSubjects = academicSettings?.subjects || ["Data Structures", "Operating Systems", "Computer Networks", "Database Systems", "Machine Learning", "Software Engineering"];

  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Computer Science");
  const [course, setCourse] = useState("B.Tech");
  const [branch, setBranch] = useState("CSE");
  const [section, setSection] = useState("A");
  const [group, setGroup] = useState("G1");
  const [selectedSubjects, setSelectedSubjects] = useState(["Data Structures", "Operating Systems"]);

  // Multi-Side Pose Photos State { center: null, left: null, right: null }
  const [capturedPoses, setCapturedPoses] = useState({ center: null, left: null, right: null });
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [useCameraMode, setUseCameraMode] = useState(false);
  const [activeUploadPoseTarget, setActiveUploadPoseTarget] = useState("ALL"); // ALL | center | left | right
  const [errorMessage, setErrorMessage] = useState("");

  // QR Code Phone Camera Session State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const [qrSuccessMsg, setQrSuccessMsg] = useState("");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const qrUnsubRef = useRef(null);

  // Stop Webcam Stream
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setUseCameraMode(false);
  };

  // Clean up QR session listener
  const stopQrSession = () => {
    if (qrUnsubRef.current) {
      qrUnsubRef.current();
      qrUnsubRef.current = null;
    }
    if (qrSessionId) {
      deleteMobileCaptureSession(qrSessionId).catch(() => {});
    }
    setIsQrModalOpen(false);
    setQrSessionId("");
  };

  // Initialize form state when opening or switching studentToEdit
  useEffect(() => {
    if (isOpen) {
      if (studentToEdit) {
        setStudentId(studentToEdit.studentId || studentToEdit.id);
        setName(studentToEdit.name || "");
        setDepartment(studentToEdit.department || deptsList[0] || "Computer Science");
        setCourse(studentToEdit.course || studentToEdit.class || coursesList[0] || "B.Tech");
        setBranch(studentToEdit.branch || branchesList[0] || "CSE");
        setSection(studentToEdit.section || sectionsList[0] || "A");
        setGroup(studentToEdit.group || "G1");
        const existingSubs = Array.isArray(studentToEdit.subjects)
          ? studentToEdit.subjects
          : (studentToEdit.subjects ? studentToEdit.subjects.split(",").map(s => s.trim()).filter(Boolean) : [availableSubjects[0] || "Data Structures"]);
        setSelectedSubjects(existingSubs);

        const existingPhoto = studentToEdit.photoUrl || null;
        setCapturedPoses({
          center: existingPhoto,
          left: existingPhoto,
          right: existingPhoto
        });
      } else {
        setStudentId(`STU_${Math.floor(100000 + Math.random() * 900000)}`);
        setName("");
        setDepartment(deptsList[0] || "Computer Science");
        setCourse(coursesList[0] || "B.Tech");
        setBranch(branchesList[0] || "CSE");
        setSection(sectionsList[0] || "A");
        setGroup("G1");
        setSelectedSubjects(availableSubjects.slice(0, 3));
        setCapturedPoses({ center: null, left: null, right: null });
      }
      setCurrentPoseIndex(0);
      setUseCameraMode(false);
      setIsQrModalOpen(false);
      setErrorMessage("");
      setQrSuccessMsg("");
    } else {
      stopCamera();
      stopQrSession();
    }
  }, [isOpen, studentToEdit]);

  // Make sure department, course, branch, section are valid defaults when academicSettings change
  useEffect(() => {
    if (!department || !deptsList.includes(department)) {
      if (deptsList[0]) setDepartment(deptsList[0]);
    }
    if (!course || !coursesList.includes(course)) {
      if (coursesList[0]) setCourse(coursesList[0]);
    }
    if (!branch || !branchesList.includes(branch)) {
      if (branchesList[0]) setBranch(branchesList[0]);
    }
    if (!section || !sectionsList.includes(section)) {
      if (sectionsList[0]) setSection(sectionsList[0]);
    }
  }, [academicSettings]);

  // Camera preview handler
  useEffect(() => {
    if (useCameraMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [useCameraMode]);

  // Handle Image File Upload (Target pose specific or ALL)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (activeUploadPoseTarget === "ALL" && files.length >= 3) {
      const readers = files.slice(0, 3).map(file => {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve(evt.target.result);
          reader.readAsDataURL(file);
        });
      });
      Promise.all(readers).then(([c, l, r]) => {
        setCapturedPoses({ center: c, left: l, right: r });
      });
    } else if (activeUploadPoseTarget !== "ALL") {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setCapturedPoses(prev => ({ ...prev, [activeUploadPoseTarget]: evt.target.result }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const url = evt.target.result;
        setCapturedPoses({ center: url, left: url, right: url });
      };
      reader.readAsDataURL(files[0]);
    }
  };

  const triggerUploadForPose = (poseId) => {
    setActiveUploadPoseTarget(poseId);
    fileInputRef.current?.click();
  };

  // Start Live Webcam Stream (3:4 ratio)
  const handleStartWebcam = async () => {
    setErrorMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" }
      });
      streamRef.current = stream;
      setUseCameraMode(true);
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMessage("Could not access webcam. Please ensure camera permissions are allowed.");
    }
  };

  // QR Code Phone Camera Session Trigger
  const handleStartQrSession = async () => {
    setErrorMessage("");
    try {
      const sess = await createMobileCaptureSession(studentId || `STU_${Date.now()}`);
      setQrSessionId(sess.sessionId);

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const captureUrl = `${origin}/mobile-capture?sessionId=${sess.sessionId}`;
      setQrUrl(captureUrl);
      setIsQrModalOpen(true);

      const unsub = subscribeToMobileCaptureSession(sess.sessionId, (data) => {
        if (data && data.status === "completed" && Array.isArray(data.photos) && data.photos.length >= 1) {
          setCapturedPoses({
            center: data.photos[0],
            left: data.photos[1] || data.photos[0],
            right: data.photos[2] || data.photos[0]
          });
          setQrSuccessMsg("3-Pose photos received successfully from mobile!");
          stopQrSession();
        }
      });
      qrUnsubRef.current = unsub;
    } catch (err) {
      console.error("Error creating QR session:", err);
      setErrorMessage("Failed to initialize mobile session: " + err.message);
    }
  };

  const handleCopyQrLink = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Capture Snapshot for Current Pose Step
  const handleCapturePose = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
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
    handleStartWebcam();
  };

  // Form Submit Handler -> Closes modal and starts background processing snackbar
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!studentId.trim() || !name.trim()) {
      setErrorMessage("Student ID and Full Name are required.");
      return;
    }

    if (!capturedPoses.center) {
      setErrorMessage("Please capture or upload face photos.");
      return;
    }

    const parsedSubjects = selectedSubjects.length > 0 ? selectedSubjects : ["General"];

    const payload = {
      studentId: studentId.trim(),
      name: name.trim(),
      department: department.trim(),
      course: course.trim(),
      branch: branch.trim(),
      studentClass: course.trim(),
      section: section.trim(),
      group: group.trim(),
      subjects: parsedSubjects,
      photos: [
        capturedPoses.center,
        capturedPoses.left || capturedPoses.center,
        capturedPoses.right || capturedPoses.center
      ]
    };

    onStartRegistration(payload);
    onClose();
  };

  if (!isOpen) return null;

  const currentPose = POSES[currentPoseIndex];
  const isAllPosesCaptured = !!(capturedPoses.center && capturedPoses.left && capturedPoses.right);
  const isEditMode = Boolean(studentToEdit);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-lg tracking-tight">
                {studentToEdit ? "Edit Student Profile" : "Register New Student"}
              </h2>
              <p className="text-xs text-slate-400">
                Multi-angle face enrolment & student master record
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {qrSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{qrSuccessMsg}</span>
            </div>
          )}

          {/* Section 1: Basic & Academic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <School className="w-4 h-4 text-indigo-600" /> 1. Academic & Student Info
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3.5 h-3.5 text-slate-400" /> Student Roll / ID
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. STU_2026_001"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  disabled={!!studentToEdit}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-slate-400" /> Department Name
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {deptsList.map((d, i) => (
                    <option key={i} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-slate-400" /> Course / Degree
                </label>
                <select
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {coursesList.map((c, i) => (
                    <option key={i} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-slate-400" /> Branch &amp; Section
                </label>
                <div className="flex gap-2">
                  <select
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {branchesList.map((b, i) => (
                      <option key={i} value={b}>{b}</option>
                    ))}
                  </select>
                  <select
                    value={section}
                    onChange={(e) => setSection(e.target.value)}
                    className="w-28 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    {sectionsList.map((sec, i) => (
                      <option key={i} value={sec}>Sec {sec}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <GroupIcon className="w-3.5 h-3.5 text-slate-400" /> Group Allotment
                </label>
                <select
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="G1">Group G1</option>
                  <option value="G2">Group G2</option>
                  <option value="ALL">ALL Groups (G1 + G2)</option>
                </select>
              </div>
            </div>

            {/* Interactive Subject Selection Tags */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <School className="w-3.5 h-3.5 text-indigo-500" /> Enrolled Subjects ({selectedSubjects.length} Selected)
                </span>
                <span className="text-[11px] text-slate-400">Click tag to toggle enrolment</span>
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl max-h-36 overflow-y-auto">
                {availableSubjects.map((sub, idx) => {
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
                  <span className="text-xs text-slate-500 font-medium">3 Pose Snapshots Ready</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleStartQrSession}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Phone QR Capture
                    </button>

                    <button
                      type="button"
                      onClick={handleRetakePoses}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" /> Re-take Webcam
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* 3 Main Action Cards: PC Camera, Phone QR, File Upload */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={handleStartWebcam}
                    className="p-4 border-2 border-indigo-500/30 bg-indigo-50/20 hover:bg-indigo-50/50 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                  >
                    <Camera className="w-6 h-6 text-indigo-600 mb-1 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-extrabold text-slate-900">PC Webcam</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Live 3-Pose Snapshots</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleStartQrSession}
                    className="p-4 border-2 border-emerald-500/40 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                  >
                    <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-1 group-hover:scale-110 transition-transform shadow-xs">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-extrabold text-emerald-950">Use Phone Camera</span>
                    <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">Scan QR Code</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => triggerUploadForPose("ALL")}
                    className="p-4 border-2 border-dashed border-slate-200 hover:border-slate-400 hover:bg-slate-100/50 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                  >
                    <Upload className="w-6 h-6 text-slate-400 group-hover:text-slate-700 mb-1" />
                    <span className="text-xs font-semibold text-slate-700">Upload File</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Local image file</span>
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
                  stopQrSession();
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

      {/* ─── REALTIME QR CODE MOBILE PHONE CAMERA SESSION MODAL ─── */}
      {isQrModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 border border-slate-200 shadow-2xl space-y-5 text-center animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-bold text-slate-900 leading-tight">Phone Camera QR Code</h4>
                  <p className="text-[10px] text-slate-500">Scan to open 3-pose camera</p>
                </div>
              </div>
              <button
                type="button"
                onClick={stopQrSession}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Generated QR Code Container */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 inline-block shadow-inner mx-auto">
              {qrUrl ? (
                <QRCodeSVG value={qrUrl} size={180} level="M" />
              ) : (
                <div className="w-[180px] h-[180px] flex items-center justify-center text-xs text-slate-400 font-mono">
                  Generating QR...
                </div>
              )}
            </div>

            {/* Live Listener Status Indicator */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-900 flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
              <span>Waiting for phone camera submission...</span>
            </div>

            {/* Direct URL & Copy Link Option */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Or Open Link on Mobile Browser:
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
                <input
                  type="text"
                  readOnly
                  value={qrUrl}
                  className="w-full bg-transparent font-mono text-[10px] text-slate-700 outline-none truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyQrLink}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold rounded-lg shrink-0 flex items-center gap-1 text-[11px]"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{isCopied ? "Copied" : "Copy"}</span>
                </button>
                <a
                  href={qrUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-indigo-600 hover:text-indigo-800 shrink-0"
                  title="Open Link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={stopQrSession}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
            >
              Cancel Phone Capture
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
