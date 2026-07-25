"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  subscribeToStudents, 
  subscribeToDatasets, 
  subscribeToAttendanceLogs, 
  subscribeToScreenConfig,
  updateScreenConfig,
  recordAttendance 
} from "@/lib/firebase";
import { detectFacesInVideo, findBestMatch, drawEyeAndLandmarkMesh, loadFaceApiModels } from "@/lib/faceApi";
import { 
  Wifi, 
  WifiOff, 
  CheckCircle2, 
  XCircle, 
  Info, 
  Power, 
  CameraOff, 
  AlertTriangle,
  RefreshCw
} from "lucide-react";

// ─── Theme map computed once outside render ───────────────────────────────────
const THEMES = {
  ATTENDANCE_MARKED:        { strokeColor: "#00C853", barBg: "#00A82D", title: "ATTENDANCE MARKED",       icon: CheckCircle2, tickBg: "#00C853" },
  ATTENDANCE_ALREADY_MARKED:{ strokeColor: "#1E88E5", barBg: "#1565C0", title: "ATTENDANCE ALREADY MARKED",icon: Info,         tickBg: "#1E88E5" },
  NOT_IN_SET:               { strokeColor: "#1E88E5", barBg: "#1565C0", title: "NOT IN ATTENDANCE SET",   icon: Info,         tickBg: "#1E88E5" },
  TIME_EXCEEDED:            { strokeColor: "#D32F2F", barBg: "#D32F2F", title: "TIME EXCEEDED",           icon: XCircle,      tickBg: "#D32F2F" },
  SUSPENDED:                { strokeColor: "#D32F2F", barBg: "#D32F2F", title: "SUSPENDED",               icon: XCircle,      tickBg: "#D32F2F" },
  FAILED_TO_RECOGNISE:      { strokeColor: "#FF6D00", barBg: "#FF6D00", title: "FAILED TO RECOGNISE",     icon: XCircle,      tickBg: "#FF6D00" },
  IDLE:                     { strokeColor: "transparent", barBg: "transparent", title: "",                icon: Info,         tickBg: "transparent" },
};

// Circle circumference: 2π × r where SVG viewBox is 100×100 and r=49 (border sits exactly on edge)
const CIRCLE_R = 49;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_R; // ≈ 307.88

export default function ScreeningPage() {
  const [students, setStudents] = useState([]);
  const [activeDatasets, setActiveDatasets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [screenConfig, setScreenConfig] = useState({ mode: "NORMAL", adminMessage: "", reloadId: 0 });
  const [currentTime, setCurrentTime] = useState("");
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  // statusState: "IDLE" | "ATTENDANCE_MARKED" | "ATTENDANCE_ALREADY_MARKED" | "NOT_IN_SET" | "TIME_EXCEEDED" | "SUSPENDED" | "FAILED_TO_RECOGNISE"
  const [statusState, setStatusState] = useState("IDLE");
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchTimestamp, setMatchTimestamp] = useState("");
  const [updateProgress, setUpdateProgress] = useState(0);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentPersonIdRef = useRef(null);
  const lastFaceSeenRef = useRef(0);
  // Store live refs to avoid re-creating detection loop on state change
  const studentsRef = useRef([]);
  const activeDatasetsRef = useRef([]);
  const attendanceLogsRef = useRef([]);
  const statusStateRef = useRef("IDLE");

  // Keep refs in sync
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { activeDatasetsRef.current = activeDatasets; }, [activeDatasets]);
  useEffect(() => { attendanceLogsRef.current = attendanceLogs; }, [attendanceLogs]);
  useEffect(() => { statusStateRef.current = statusState; }, [statusState]);

  // ─── Audio Synthesizer ────────────────────────────────────────────────────
  const playStateAudio = useCallback((state) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      if (state === "ATTENDANCE_MARKED") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.15);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      } else if (state === "ATTENDANCE_ALREADY_MARKED" || state === "NOT_IN_SET") {
        osc.type = "sine";
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(350, now + 0.15);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.setValueAtTime(200, now + 0.15);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }, []);

  // ─── Firebase + Models + Clock ────────────────────────────────────────────
  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubDatasets = subscribeToDatasets((data) => {
      setActiveDatasets(data.filter((d) => d.active === true));
    });
    const unsubLogs = subscribeToAttendanceLogs(setAttendanceLogs);
    const unsubConfig = subscribeToScreenConfig(setScreenConfig);
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);
    loadFaceApiModels().then(() => setIsModelsLoaded(true)).catch(console.error);
    return () => { unsubStudents(); unsubDatasets(); unsubLogs(); unsubConfig(); clearInterval(timer); };
  }, []);

  // ─── Update Progress Bar (one-shot, no loop) ──────────────────────────────
  useEffect(() => {
    if (screenConfig.reloadId && screenConfig.mode === "UPDATING") {
      const lastProcessed = sessionStorage.getItem("last_reload_id");
      const rid = String(screenConfig.reloadId);
      if (lastProcessed === rid) return;
      sessionStorage.setItem("last_reload_id", rid);
      setUpdateProgress(0);
      const interval = setInterval(() => {
        setUpdateProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            updateScreenConfig({ mode: "NORMAL" }).then(() => setTimeout(() => window.location.reload(), 300));
            return 100;
          }
          return Math.min(100, prev + Math.floor(Math.random() * 10) + 5);
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [screenConfig.mode, screenConfig.reloadId]);

  // ─── Camera Init ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (screenConfig.mode !== "NORMAL") return;
    let stream = null;
    const start = async () => {
      try {
        const preferredId = localStorage.getItem("preferred_camera_device_id");
        if (preferredId) {
          try { stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: preferredId } } }); } catch {}
        }
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      } catch (e) { console.error("Camera:", e); }
    };
    start();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [screenConfig.mode]);

  // ─── Detection Loop — uses refs, NO state dependencies ────────────────────
  useEffect(() => {
    if (!isModelsLoaded || screenConfig.mode !== "NORMAL") return;

    let processing = false;

    const loop = async () => {
      const video = videoRef.current;
      if (video && video.readyState === 4 && !processing) {
        processing = true;
        try {
          const detections = await detectFacesInVideo(video);
          if (canvasRef.current) drawEyeAndLandmarkMesh(canvasRef.current, video, detections);
          const now = Date.now();

          if (detections.length > 0) {
            lastFaceSeenRef.current = now;
            const det = detections[0];
            const liveDesc = Array.from(det.descriptor);
            const threshold = parseFloat(localStorage.getItem("face_match_threshold") || "0.48");
            const match = findBestMatch(liveDesc, studentsRef.current, threshold);

            if (match?.student) {
              const student = match.student;
              const studentId = student.studentId || student.id;

              // Same person still in frame — do nothing
              if (currentPersonIdRef.current === studentId) { processing = false; animationFrameRef.current = requestAnimationFrame(loop); return; }

              currentPersonIdRef.current = studentId;
              const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setMatchTimestamp(ts);

              if (student.suspended || student.isSuspended) {
                setStatusState("SUSPENDED"); setActiveMatch(student); playStateAudio("SUSPENDED");
              } else {
                const ds = activeDatasetsRef.current;
                let matched = null;
                if (ds.length > 0) {
                  matched = ds.find((d) => {
                    const okC = d.classes?.length ? d.classes.includes(student.class) : true;
                    const okS = d.sections?.length ? d.sections.includes(student.section) : true;
                    const okG = d.groups?.length ? d.groups.includes(student.group) : true;
                    return okC && okS && okG;
                  });
                }

                if (!matched) {
                  setStatusState("NOT_IN_SET"); setActiveMatch(student); playStateAudio("NOT_IN_SET");
                } else {
                  const today = new Date().toISOString().split("T")[0];
                  const already = attendanceLogsRef.current.find(
                    (l) => (l.studentId === studentId || l.studentId === student.id) && l.date === today
                  );
                  if (already) {
                    setStatusState("ATTENDANCE_ALREADY_MARKED"); setActiveMatch(student);
                    if (already.formattedTime) setMatchTimestamp(already.formattedTime);
                    playStateAudio("ATTENDANCE_ALREADY_MARKED");
                  } else {
                    let late = false;
                    if (matched.timing?.maxEntryTime) {
                      const [ch, cm] = matched.timing.maxEntryTime.split(":").map(Number);
                      const d = new Date();
                      late = d.getHours() > ch || (d.getHours() === ch && d.getMinutes() > cm);
                    }
                    if (late) {
                      setStatusState("TIME_EXCEEDED"); setActiveMatch(student); playStateAudio("TIME_EXCEEDED");
                    } else {
                      setStatusState("ATTENDANCE_MARKED"); setActiveMatch(student); playStateAudio("ATTENDANCE_MARKED");
                      recordAttendance({ studentId, name: student.name, class: student.class, section: student.section, group: student.group, datasetName: matched.name || "Master List", type: "ENTRY", timestamp: new Date().toISOString() }).catch(console.error);
                    }
                  }
                }
              }
            } else if (det.detection.score < 0.4 && statusStateRef.current === "IDLE") {
              setStatusState("FAILED_TO_RECOGNISE"); setActiveMatch(null); playStateAudio("FAILED_TO_RECOGNISE");
            }
          } else {
            // No face — vanish after 1 second
            if (now - lastFaceSeenRef.current > 1000 && (currentPersonIdRef.current !== null || statusStateRef.current !== "IDLE")) {
              currentPersonIdRef.current = null;
              setStatusState("IDLE");
              setActiveMatch(null);
            }
          }
        } catch (e) { console.error(e); }
        finally { processing = false; }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  // Only depends on isModelsLoaded and mode — refs handle everything else
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelsLoaded, screenConfig.mode]);

  const theme = THEMES[statusState] || THEMES.IDLE;
  const StatusIcon = theme.icon;
  const isActive = statusState !== "IDLE";
  const ringOffset = isActive ? 0 : CIRCUMFERENCE;

  // ─── Override Screens ─────────────────────────────────────────────────────
  if (screenConfig.mode !== "NORMAL") {
    return (
      <div className="fixed inset-0 bg-black flex flex-col font-sans text-white">
        <div className="bg-[#111111] px-5 py-3 flex items-center justify-between shrink-0">
          <Wifi className="w-5 h-5 text-white" />
          <span className="text-white text-sm font-semibold tracking-wide">{currentTime}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6">
          {screenConfig.mode === "UPDATING" && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full space-y-6 flex flex-col items-center">
              <div className="w-24 h-24 rounded-full bg-neutral-900 border-4 border-[#00C853] flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-[#00C853] animate-spin" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-wider text-white uppercase">UPDATING SYSTEM...</h2>
                <p className="text-neutral-400 text-xs font-semibold mt-1">DOWNLOADING DATASET &amp; BIOMETRICS</p>
              </div>
              <div className="w-full max-w-[280px] space-y-2">
                <div className="w-full h-3.5 bg-neutral-900 rounded-full border border-neutral-700 overflow-hidden p-0.5">
                  <div className="h-full bg-[#00C853] rounded-full transition-all duration-150" style={{ width: `${Math.min(100, updateProgress)}%` }} />
                </div>
                <div className="flex justify-between text-xs font-mono font-bold px-1">
                  <span className="text-neutral-400">PROGRESS</span>
                  <span className="text-[#00C853]">{Math.min(100, updateProgress)}%</span>
                </div>
              </div>
            </motion.div>
          )}
          {screenConfig.mode === "CLOSED" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-6">
              <Power className="w-28 h-28 text-[#FF6D00]" />
              <h2 className="text-2xl font-black tracking-wider uppercase">ATTENDANCE MARKING CLOSED</h2>
            </motion.div>
          )}
          {screenConfig.mode === "DISCONNECTED" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center"><WifiOff className="w-16 h-16" /></div>
              <h2 className="text-2xl font-black tracking-wider uppercase">SERVER DISCONNECTED</h2>
              <p className="text-neutral-400 text-xs font-mono tracking-widest uppercase">ERROR CODE : 40X2E</p>
            </motion.div>
          )}
          {screenConfig.mode === "NO_CAMERA" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex flex-col items-center gap-4">
              <div className="w-32 h-32 rounded-full border-4 border-[#D32F2F] flex items-center justify-center"><CameraOff className="w-16 h-16 text-[#D32F2F]" /></div>
              <h2 className="text-2xl font-black tracking-wider uppercase">NO WEBCAM DETECTED</h2>
              <p className="text-neutral-400 text-xs font-semibold uppercase">PLEASE CHECK CAMERA AND WIRES</p>
              <p className="text-neutral-500 text-xs font-mono uppercase">ERROR CODE : 40X2E</p>
            </motion.div>
          )}
          {screenConfig.mode === "MAINTENANCE" && (
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full space-y-8">
              <div className="flex flex-col items-center gap-4">
                <AlertTriangle className="w-24 h-24 text-[#FFD600]" />
                <h2 className="text-xl font-black tracking-wider text-[#FF6D00] uppercase">SCREEN IN MAINTANENCE</h2>
              </div>
              <div className="w-full bg-[#181818] p-6 rounded-xl border border-neutral-800 text-left">
                <div className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider mb-2">ADMIN MESSAGE</div>
                <div className="text-sm text-neutral-400 font-medium leading-relaxed">{screenConfig.adminMessage || "System is undergoing scheduled maintenance."}</div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="py-3 text-center text-neutral-600 text-[10px] tracking-widest uppercase font-mono border-t border-neutral-900 shrink-0">
          SCREEN ONLINE | V 1.2.7
        </div>
      </div>
    );
  }

  // ─── Live Scanner (Full Screen) ───────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black flex flex-col font-sans text-white overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="bg-[#111111] px-5 py-3 flex items-center justify-between shrink-0 z-20">
        <Wifi className="w-5 h-5 text-white" />
        <span className="text-white text-sm font-semibold tracking-wide">{currentTime}</span>
      </div>

      {/* Camera Section — fills available height */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Outer wrapper: positions SVG ring OUTSIDE the clipping circle */}
        <div className="relative">
          {/* Floating Tick Badge — above the circle */}
          <AnimatePresence>
            {isActive && (
              <motion.div
                key="tick"
                initial={{ y: 16, opacity: 0, scale: 0.5 }}
                animate={{ y: -20, opacity: 1, scale: 1 }}
                exit={{ y: 0, opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                style={{ backgroundColor: theme.tickBg, willChange: "transform, opacity" }}
                className="absolute left-1/2 -translate-x-1/2 top-0 z-30 w-11 h-11 rounded-full text-white flex items-center justify-center shadow-xl border-2 border-white"
              >
                <StatusIcon className="w-6 h-6 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Circular Video — clipped to circle, no overflow bleed */}
          <div className="w-[280px] h-[280px] rounded-full overflow-hidden bg-neutral-900 shadow-2xl relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
            />
          </div>

          {/* SVG Ring — sits OUTSIDE overflow:hidden, directly on border edge */}
          <svg
            className="absolute pointer-events-none"
            style={{
              top: "-4px",
              left: "-4px",
              width: "288px",
              height: "288px",
              willChange: "transform"
            }}
            viewBox="0 0 288 288"
          >
            <circle
              cx="144"
              cy="144"
              r="143"
              fill="none"
              stroke={isActive ? theme.strokeColor : "transparent"}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={ringOffset}
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), stroke 0.3s ease" }}
              transform="rotate(-90 144 144)"
            />
          </svg>
        </div>
      </div>

      {/* Status Banner — attached below camera, CSS transition only (fast) */}
      <div
        className="w-full py-3.5 px-4 flex items-center justify-center gap-2 font-extrabold text-sm tracking-widest uppercase text-white shrink-0"
        style={{
          backgroundColor: isActive ? theme.barBg : "transparent",
          minHeight: "48px",
          transition: "background-color 0.25s ease",
          willChange: "background-color"
        }}
      >
        {isActive && (
          <>
            <StatusIcon className="w-5 h-5 text-white shrink-0" />
            <span className="t-shimmer" data-text={theme.title}>{theme.title}</span>
          </>
        )}
      </div>

      {/* Student Profile Card — bottom section */}
      <div className="p-5 shrink-0" style={{ minHeight: "200px" }}>
        <AnimatePresence mode="wait">
          {isActive && activeMatch && (
            <motion.div
              key={activeMatch.studentId || "match"}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 18 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              style={{ willChange: "transform, opacity" }}
              className="space-y-3"
            >
              {/* Photo + Name */}
              <div className="flex items-center gap-4">
                {activeMatch.photoUrl ? (
                  <img src={activeMatch.photoUrl} alt={activeMatch.name} className="w-[72px] h-[72px] rounded-xl object-cover border border-white/20 shadow-md bg-neutral-800" />
                ) : (
                  <div className="w-[72px] h-[72px] rounded-xl bg-[#555] border border-white/20 flex items-center justify-center font-bold text-2xl text-white">
                    {activeMatch.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold text-neutral-400 uppercase tracking-widest">STU_ID: {activeMatch.studentId}</div>
                  <div className="text-xl font-black text-white leading-tight truncate">{activeMatch.name}</div>
                </div>
              </div>

              {/* Pills */}
              <div className="flex gap-3">
                <div className="flex-1 bg-[#FF8F00] text-black font-black text-xs py-2 px-3 rounded-lg text-center uppercase tracking-wider">
                  {activeMatch.class} - {activeMatch.section}
                </div>
                <div className="flex-1 bg-[#FF6F00] text-black font-black text-xs py-2 px-3 rounded-lg text-center uppercase tracking-wider">
                  GROUP {activeMatch.group}
                </div>
              </div>

              {/* Timestamp */}
              <div className="w-full bg-[#536DFE] text-white font-black text-sm py-2.5 rounded-xl text-center tracking-wider uppercase shadow-md">
                [{matchTimestamp}]
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="pb-3 text-center text-neutral-600 text-[10px] tracking-widest uppercase font-mono border-t border-neutral-900 pt-2 shrink-0">
        SCREEN ONLINE | CAMERA ID | V 1.2.7
      </div>
    </div>
  );
}
