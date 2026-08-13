"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Camera, 
  SwitchCamera, 
  CheckCircle2, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  Smartphone, 
  User, 
  RefreshCw,
  Check,
  X,
  ArrowRight
} from "lucide-react";
import { subscribeToMobileCaptureSession, submitMobileCaptureSession } from "@/lib/firebase";

const POSES = [
  { step: 0, id: "center", label: "Pose 1: Look Center", subtitle: "Align face straight looking at camera" },
  { step: 1, id: "left",   label: "Pose 2: Turn Left",   subtitle: "Turn head slightly to your left" },
  { step: 2, id: "right",  label: "Pose 3: Turn Right",  subtitle: "Turn head slightly to your right" }
];

function MobileCaptureContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session");

  const [sessionData, setSessionData] = useState(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [capturedPoses, setCapturedPoses] = useState({ center: null, left: null, right: null });
  const [facingMode, setFacingMode] = useState("user"); // "user" | "environment"
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [activePoseUpload, setActivePoseUpload] = useState("center");

  // Subscribe to session data from Firebase
  useEffect(() => {
    if (!sessionId) return;
    const unsub = subscribeToMobileCaptureSession(sessionId, (data) => {
      setSessionData(data);
      if (data && data.status === "completed") {
        setIsSubmitted(true);
      }
    });
    return () => unsub();
  }, [sessionId]);

  // Start Camera Stream
  const startCamera = async () => {
    setErrorMsg("");
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 720 },
          height: { ideal: 960 }
        }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error("Mobile camera error:", err);
      setErrorMsg("Unable to access phone camera: " + err.message);
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [facingMode]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  // Capture Snapshot for Current Pose Step
  const captureCurrentPose = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 480;
    canvas.height = videoRef.current.videoHeight || 640;
    const ctx = canvas.getContext("2d");

    // Mirror image if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.90);
    const poseKey = POSES[currentPoseIndex].id;

    setCapturedPoses((prev) => ({ ...prev, [poseKey]: dataUrl }));

    if (currentPoseIndex < POSES.length - 1) {
      setCurrentPoseIndex((prev) => prev + 1);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const src = event.target.result;
        setCapturedPoses((prev) => ({ ...prev, [activePoseUpload]: src }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRetakeAll = () => {
    setCapturedPoses({ center: null, left: null, right: null });
    setCurrentPoseIndex(0);
    startCamera();
  };

  const handleSubmitToComputer = async () => {
    if (!capturedPoses.center) {
      setErrorMsg("Please capture or upload at least 1 photo.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const photos = [
        capturedPoses.center,
        capturedPoses.left || capturedPoses.center,
        capturedPoses.right || capturedPoses.center
      ];
      await submitMobileCaptureSession(sessionId, photos);
      stopCamera();
      setIsSubmitted(true);
    } catch (err) {
      setErrorMsg("Submission failed: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPose = POSES[currentPoseIndex];
  const isAllCaptured = !!(capturedPoses.center && capturedPoses.left && capturedPoses.right);

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h1 className="text-lg font-bold">Invalid QR Session</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Session ID is missing in URL. Please scan the QR Code from your computer screen again.
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center font-sans space-y-4">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1">
          <h1 className="text-xl font-extrabold text-white">Photos Submitted to Computer!</h1>
          <p className="text-xs text-slate-300 max-w-xs mx-auto">
            Your 3-pose reference photos have been streamed to the computer. You can now return to your computer screen to finalize registration.
          </p>
        </div>

        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 max-w-xs w-full text-xs font-mono text-slate-400 space-y-1">
          <div>Session: {sessionId}</div>
          {sessionData?.studentName && (
            <div className="font-bold text-indigo-400">{sessionData.studentName}</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col max-w-md mx-auto shadow-2xl overflow-hidden">
      {/* Header */}
      <header className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-md shadow-indigo-500/30">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">Mobile Camera Capture</h1>
            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[180px]">
              {sessionData?.studentName ? `Student: ${sessionData.studentName}` : `Session: ${sessionId}`}
            </p>
          </div>
        </div>

        <button
          onClick={toggleCameraFacing}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-all flex items-center gap-1 text-xs font-bold"
          title="Switch Camera (Front/Rear)"
        >
          <SwitchCamera className="w-4 h-4" />
          <span className="text-[10px] uppercase">{facingMode === "user" ? "Front" : "Rear"}</span>
        </button>
      </header>

      {/* Main Body */}
      <main className="flex-1 p-4 space-y-4 overflow-y-auto">
        {errorMsg && (
          <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pose Progress Bar */}
        <div className="bg-slate-900 p-3.5 rounded-2xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span>{currentPose.label}</span>
            <span className="text-indigo-400 font-mono text-[11px]">Step {currentPoseIndex + 1} of 3</span>
          </div>
          <p className="text-[11px] text-slate-400">{currentPose.subtitle}</p>

          <div className="flex gap-1.5 pt-1">
            {POSES.map((p, idx) => (
              <div
                key={p.id}
                className={`h-2 flex-1 rounded-full transition-all ${
                  idx === currentPoseIndex
                    ? "bg-indigo-500 shadow-sm shadow-indigo-500/50 animate-pulse"
                    : capturedPoses[p.id]
                    ? "bg-emerald-500"
                    : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Camera Stream Box */}
        <div className="relative rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 aspect-[3/4] w-full max-w-[320px] mx-auto shadow-2xl flex items-center justify-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${facingMode === "user" ? "-scale-x-100" : ""}`}
          />

          {/* Guide Overlay */}
          <div className="absolute inset-6 border-2 border-dashed border-indigo-400/50 rounded-[45px] pointer-events-none flex flex-col items-center justify-between p-4">
            <span className="text-[10px] font-bold text-white bg-black/60 px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-xs">
              {currentPose.id.toUpperCase()} ALIGNMENT
            </span>
          </div>

          {/* Floating Action Button */}
          <div className="absolute bottom-4 flex items-center gap-2">
            <button
              type="button"
              onClick={captureCurrentPose}
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow-xl shadow-indigo-600/30 flex items-center gap-2 transition-all active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>{currentPoseIndex < 2 ? "Snap & Next Pose" : "Snap Final Pose"}</span>
            </button>
          </div>
        </div>

        {/* Captured 3-Pose Thumbnails */}
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 space-y-3">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span>Captured Reference Poses</span>
            <button
              type="button"
              onClick={handleRetakeAll}
              className="text-[11px] text-indigo-400 font-semibold hover:underline flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Re-take All
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {POSES.map((p) => {
              const imgData = capturedPoses[p.id];
              return (
                <div key={p.id} className="space-y-1 text-center">
                  <div className="aspect-[3/4] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden relative shadow-xs">
                    {imgData ? (
                      <img src={imgData} alt={p.label} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600 text-[10px] italic">
                        Pending
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[9px] font-bold uppercase rounded py-0.5">
                      {p.id}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setActivePoseUpload(p.id);
                      fileInputRef.current?.click();
                    }}
                    className="text-[10px] text-slate-400 hover:text-indigo-300 font-medium block w-full truncate"
                  >
                    Upload {p.id}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Submit to Computer Button */}
        <button
          type="button"
          onClick={handleSubmitToComputer}
          disabled={!capturedPoses.center || isSubmitting}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-40"
        >
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Sending to Computer...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 fill-slate-950" />
              <span>Submit 3 Poses to Computer</span>
            </>
          )}
        </button>
      </main>
    </div>
  );
}

export default function MobileCapturePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 text-white flex items-center justify-center text-xs">Loading Camera Session...</div>}>
      <MobileCaptureContent />
    </Suspense>
  );
}
