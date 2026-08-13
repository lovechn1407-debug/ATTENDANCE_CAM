"use client";

import React, { useState, useRef, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { 
  X, 
  Camera, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  UserCheck,
  ArrowRight, 
  Play, 
  Filter, 
  UserX,
  RefreshCw,
  Search,
  Check,
  QrCode,
  Smartphone,
  Copy,
  ExternalLink
} from "lucide-react";
import { createMobileCaptureSession, subscribeToMobileCaptureSession, deleteMobileCaptureSession } from "@/lib/firebase";

export default function UpdatePhotosModal({ isOpen, onClose, students = [], onStartRegistration }) {
  const [selectedClass, setSelectedClass] = useState("ALL");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  // Wizard mode states
  const [isWizardActive, setIsWizardActive] = useState(false);
  const [wizardQueue, setWizardQueue] = useState([]);
  const [wizardIndex, setWizardIndex] = useState(0);

  // 3-Pose Capture state for active wizard student
  const [capturedPoses, setCapturedPoses] = useState({ center: null, left: null, right: null });
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // QR Code Session State
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrSessionId, setQrSessionId] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const qrUnsubRef = useRef(null);

  // Stop Webcam Stream Helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

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

  // Start Camera for current wizard student
  const startCamera = async () => {
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
      setErrorMessage("Could not access webcam: " + err.message);
    }
  };

  const handleStartQrSession = async () => {
    setErrorMessage("");
    const currentStudent = wizardQueue[wizardIndex];
    const sessionId = `qr_sub_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    setQrSessionId(sessionId);

    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const targetUrl = `${origin}/mobile-capture?session=${sessionId}`;
    setQrUrl(targetUrl);

    try {
      await createMobileCaptureSession(sessionId, { studentId: currentStudent?.studentId, name: currentStudent?.name });
      setIsQrModalOpen(true);

      qrUnsubRef.current = subscribeToMobileCaptureSession(sessionId, (data) => {
        if (data && data.status === "completed" && Array.isArray(data.photos) && data.photos.length > 0) {
          const photos = data.photos;
          setCapturedPoses({
            center: photos[0],
            left: photos[1] || photos[0],
            right: photos[2] || photos[0]
          });
          setTimeout(() => {
            stopQrSession();
          }, 1500);
        }
      });
    } catch (err) {
      setErrorMessage("Failed to start phone camera session: " + err.message);
    }
  };

  const handleCopyQrLink = () => {
    if (qrUrl) {
      navigator.clipboard.writeText(qrUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  // Filter students with missing photoUrl
  const missingStudents = Array.isArray(students) ? students.filter(s => !s.photoUrl || s.photoUrl.trim() === "") : [];

  // Filtered missing students
  const filteredMissing = missingStudents.filter(s => {
    const matchesClass = selectedClass === "ALL" || s.class === selectedClass;
    const matchesGroup = selectedGroup === "ALL" || s.group === selectedGroup;
    const matchesSearch = (s.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (s.studentId || "").toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClass && matchesGroup && matchesSearch;
  });

  const availableClasses = Array.from(new Set(missingStudents.map(s => s.class).filter(Boolean))).sort();

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setIsWizardActive(false);
      setWizardQueue([]);
      setWizardIndex(0);
      setCapturedPoses({ center: null, left: null, right: null });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Start Wizard Sequence for selected list
  const handleStartWizard = () => {
    if (filteredMissing.length === 0) {
      alert("No students with missing photos match the selected filters.");
      return;
    }
    setWizardQueue(filteredMissing);
    setWizardIndex(0);
    setCapturedPoses({ center: null, left: null, right: null });
    setCurrentPoseIndex(0);
    setIsWizardActive(true);
    startCamera();
  };

  // Start single student capture
  const handleSingleCapture = (student) => {
    setWizardQueue([student]);
    setWizardIndex(0);
    setCapturedPoses({ center: null, left: null, right: null });
    setCurrentPoseIndex(0);
    setIsWizardActive(true);
    startCamera();
  };

  // Capture current pose
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
    const poseKeys = ["center", "left", "right"];
    const poseKey = poseKeys[currentPoseIndex];

    setCapturedPoses(prev => ({ ...prev, [poseKey]: dataUrl }));

    if (currentPoseIndex < 2) {
      setCurrentPoseIndex(prev => prev + 1);
    }
  };

  // Confirm photo for active student and immediately advance wizard
  const handleConfirmAndNext = () => {
    const currentStudent = wizardQueue[wizardIndex];
    if (!currentStudent || !capturedPoses.center) {
      setErrorMessage("Please capture at least the front/center face photo.");
      return;
    }

    // Dispatch background job to snackbar
    if (onStartRegistration) {
      onStartRegistration({
        studentId: currentStudent.studentId,
        name: currentStudent.name,
        studentClass: currentStudent.class,
        section: currentStudent.section,
        group: currentStudent.group,
        photos: [
          capturedPoses.center,
          capturedPoses.left || capturedPoses.center,
          capturedPoses.right || capturedPoses.center
        ]
      });
    }

    // Reset pose state for next student
    setCapturedPoses({ center: null, left: null, right: null });
    setCurrentPoseIndex(0);

    // Advance to next student or finish
    if (wizardIndex < wizardQueue.length - 1) {
      setWizardIndex(prev => prev + 1);
    } else {
      stopCamera();
      setIsWizardActive(false);
      alert("All photo captures completed! Background processing status is displayed in the bottom-right snackbar.");
    }
  };

  const currentWizardStudent = wizardQueue[wizardIndex];
  const posesList = [
    { id: "center", label: "Pose 1: Center Front" },
    { id: "left",   label: "Pose 2: Turn Left" },
    { id: "right",  label: "Pose 3: Turn Right" }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" /> Missing Student Photos Manager ({missingStudents.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Rapid batch capture photos for CSV imported students without reference photos
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

        {/* Dynamic Body: List Mode vs Rapid Wizard Capture Mode */}
        {!isWizardActive ? (
          <div className="p-6 space-y-5">
            {/* Top Wizard Trigger Bar */}
            <div className="bg-indigo-50/80 p-5 rounded-2xl border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                  <Play className="w-4 h-4 text-indigo-600 fill-indigo-600" /> Run All Rapid Capture Wizard
                </h4>
                <p className="text-xs text-indigo-700 mt-0.5">
                  Sequentially capture 3:4 ratio photos student-by-student with auto-background snackbar processing.
                </p>
              </div>

              <button
                onClick={handleStartWizard}
                disabled={filteredMissing.length === 0}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center gap-2 shrink-0 transition-all disabled:opacity-40"
              >
                <Sparkles className="w-4 h-4" />
                <span>Start Rapid Wizard ({filteredMissing.length})</span>
              </button>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search missing student name/ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">All Classes</option>
                  {availableClasses.map(c => (
                    <option key={c} value={c}>Class {c}</option>
                  ))}
                </select>

                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
                >
                  <option value="ALL">All Groups</option>
                  <option value="A">Group A</option>
                  <option value="B">Group B</option>
                </select>
              </div>
            </div>

            {/* Missing Students Table */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[360px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">ID</th>
                    <th className="py-3 px-4">Class &amp; Sec</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredMissing.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                        All students in this filter have reference photos!
                      </td>
                    </tr>
                  ) : (
                    filteredMissing.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-900">{student.name}</td>
                        <td className="py-3 px-4 font-mono text-slate-500">{student.studentId}</td>
                        <td className="py-3 px-4">Class {student.class}-{student.section}</td>
                        <td className="py-3 px-4 font-bold text-indigo-600">Group {student.group}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => handleSingleCapture(student)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center gap-1.5 ml-auto text-[11px]"
                          >
                            <Camera className="w-3.5 h-3.5" /> Capture Photo
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Rapid Wizard 3:4 Aspect Camera Capture Screen */
          <div className="p-6 space-y-5 animate-in fade-in duration-200">
            {/* Student Queue Progress Header */}
            <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-lg">
                  {wizardIndex + 1}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    {currentWizardStudent?.name}
                    <span className="text-xs font-mono text-indigo-400">({currentWizardStudent?.studentId})</span>
                  </h4>
                  <p className="text-xs text-slate-400">
                    Class {currentWizardStudent?.class}-{currentWizardStudent?.section} • Group {currentWizardStudent?.group}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  {wizardIndex + 1} of {wizardQueue.length}
                </span>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider">Remaining in Queue</p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-50 text-red-700 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* 3:4 Camera & Pose Capture Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              {/* 3:4 Live Webcam Feed */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 aspect-[3/4] max-w-[240px] mx-auto flex items-center justify-center shadow-md">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover -scale-x-100" 
                />
                
                <div className="absolute top-2 left-2 right-2 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold uppercase py-1 px-2.5 rounded-lg text-center truncate">
                  {posesList[currentPoseIndex]?.label}
                </div>

                <button
                  type="button"
                  onClick={captureCurrentPose}
                  className="absolute bottom-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Camera className="w-4 h-4" /> Snap {posesList[currentPoseIndex]?.id}
                </button>
              </div>

              {/* 3 Poses Thumbnail Preview Box */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Captured Poses (Front, Left, Right)
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {posesList.map((p) => {
                    const data = capturedPoses[p.id];
                    return (
                      <div key={p.id} className="aspect-[3/4] rounded-xl bg-slate-100 border border-slate-300 overflow-hidden relative text-center">
                        {data ? (
                          <img src={data} alt={p.label} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                            Empty
                          </div>
                        )}
                        <span className="absolute bottom-0.5 left-0.5 right-0.5 bg-black/70 text-white text-[8px] font-bold uppercase rounded py-0.5 truncate">
                          {p.id}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleConfirmAndNext}
                    disabled={!capturedPoses.center}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-40 transition-all"
                  >
                    <span>Confirm &amp; Next Student</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleStartQrSession}
                      className="py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs rounded-xl border border-emerald-200 flex items-center justify-center gap-1.5"
                    >
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" /> Phone QR
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCapturedPoses({ center: null, left: null, right: null });
                        setCurrentPoseIndex(0);
                      }}
                      className="py-2 bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl border border-slate-200 flex items-center justify-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Re-snap
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
              <button
                onClick={() => {
                  stopCamera();
                  stopQrSession();
                  setIsWizardActive(false);
                }}
                className="text-slate-500 hover:text-slate-800 font-medium"
              >
                ← Exit Rapid Wizard
              </button>
              <span className="text-slate-400 font-mono text-[11px]">
                Background jobs process in snackbar
              </span>
            </div>
          </div>
        )}

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
    </div>
  );
}
