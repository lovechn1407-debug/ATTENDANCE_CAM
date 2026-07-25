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
  CheckCircle2, XCircle, Info, Power, CameraOff, AlertTriangle, RefreshCw, WifiOff
} from "lucide-react";

// ─── Status theme map ─────────────────────────────────────────────────────────
const THEMES = {
  IDLE:                     { glow: "rgba(255,255,255,0.04)", ring: "#ffffff22", label: "READY TO SCAN",      icon: null,          accent: "#ffffff33", barBg: "transparent" },
  ATTENDANCE_MARKED:        { glow: "rgba(0,200,83,0.18)",   ring: "#00C853",   label: "ATTENDANCE MARKED",  icon: CheckCircle2,  accent: "#00C853",   barBg: "#00A82D" },
  ATTENDANCE_ALREADY_MARKED:{ glow: "rgba(30,136,229,0.18)", ring: "#1E88E5",   label: "ATTENDANCE ALREADY MARKED", icon: Info,   accent: "#1E88E5",   barBg: "#1565C0" },
  NOT_IN_SET:               { glow: "rgba(30,136,229,0.18)", ring: "#1E88E5",   label: "NOT IN ATTENDANCE SET",   icon: Info,   accent: "#1E88E5",   barBg: "#1565C0" },
  TIME_EXCEEDED:            { glow: "rgba(211,47,47,0.18)",  ring: "#D32F2F",   label: "TIME EXCEEDED",      icon: XCircle,       accent: "#D32F2F",   barBg: "#D32F2F" },
  SUSPENDED:                { glow: "rgba(211,47,47,0.18)",  ring: "#D32F2F",   label: "SUSPENDED",          icon: XCircle,       accent: "#D32F2F",   barBg: "#D32F2F" },
  FAILED_TO_RECOGNISE:      { glow: "rgba(255,109,0,0.18)",  ring: "#FF6D00",   label: "FAILED TO RECOGNISE", icon: XCircle,      accent: "#FF6D00",   barBg: "#FF6D00" },
};

const CIRCLE_SIZE = 300; // px
const RING_R = 149;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

export default function ScreeningPage() {
  const [students, setStudents] = useState([]);
  const [activeDatasets, setActiveDatasets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [screenConfig, setScreenConfig] = useState({ mode: "NORMAL", adminMessage: "", reloadId: 0 });
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [statusState, setStatusState] = useState("IDLE");
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchTimestamp, setMatchTimestamp] = useState("");
  const [updateProgress, setUpdateProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0); // 0-100 for scan line position

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scanLineRef = useRef(null);
  const currentPersonIdRef = useRef(null);
  const lastFaceSeenRef = useRef(0);

  // live refs so detection loop doesn't recreate
  const studentsRef = useRef([]);
  const activeDatasetsRef = useRef([]);
  const attendanceLogsRef = useRef([]);
  const statusStateRef = useRef("IDLE");
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { activeDatasetsRef.current = activeDatasets; }, [activeDatasets]);
  useEffect(() => { attendanceLogsRef.current = attendanceLogs; }, [attendanceLogs]);
  useEffect(() => { statusStateRef.current = statusState; }, [statusState]);

  // ─── Audio ────────────────────────────────────────────────────────────────
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
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
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
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now); osc.stop(now + 0.5);
    } catch {}
  }, []);

  // ─── Firebase + clock ─────────────────────────────────────────────────────
  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubDatasets = subscribeToDatasets((data) => setActiveDatasets(data.filter((d) => d.active === true)));
    const unsubLogs = subscribeToAttendanceLogs(setAttendanceLogs);
    const unsubConfig = subscribeToScreenConfig(setScreenConfig);
    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    tick();
    const timer = setInterval(tick, 1000);
    loadFaceApiModels().then(() => setIsModelsLoaded(true)).catch(console.error);
    return () => { unsubStudents(); unsubDatasets(); unsubLogs(); unsubConfig(); clearInterval(timer); };
  }, []);

  // ─── Idle scan line animation ─────────────────────────────────────────────
  useEffect(() => {
    if (statusState !== "IDLE") { clearInterval(scanLineRef.current); return; }
    let pos = 0; let dir = 1;
    scanLineRef.current = setInterval(() => {
      pos += dir * 2;
      if (pos >= 100) { pos = 100; dir = -1; }
      if (pos <= 0)   { pos = 0;   dir =  1; }
      setScanLine(pos);
    }, 16);
    return () => clearInterval(scanLineRef.current);
  }, [statusState]);

  // ─── Force update progress ────────────────────────────────────────────────
  useEffect(() => {
    if (screenConfig.reloadId && screenConfig.mode === "UPDATING") {
      const rid = String(screenConfig.reloadId);
      if (sessionStorage.getItem("last_reload_id") === rid) return;
      sessionStorage.setItem("last_reload_id", rid);
      setUpdateProgress(0);
      const iv = setInterval(() => {
        setUpdateProgress((p) => {
          if (p >= 100) {
            clearInterval(iv);
            updateScreenConfig({ mode: "NORMAL" }).then(() => setTimeout(() => window.location.reload(), 300));
            return 100;
          }
          return Math.min(100, p + Math.floor(Math.random() * 10) + 5);
        });
      }, 100);
      return () => clearInterval(iv);
    }
  }, [screenConfig.mode, screenConfig.reloadId]);

  // ─── Camera ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (screenConfig.mode !== "NORMAL") return;
    let stream = null;
    const start = async () => {
      try {
        const pid = localStorage.getItem("preferred_camera_device_id");
        if (pid) { try { stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: pid } } }); } catch {} }
        if (!stream) stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play().catch(() => {}); }
      } catch (e) { console.error("Camera:", e); }
    };
    start();
    return () => { if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [screenConfig.mode]);

  // ─── Detection loop ───────────────────────────────────────────────────────
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
              if (currentPersonIdRef.current === studentId) { processing = false; animationFrameRef.current = requestAnimationFrame(loop); return; }
              currentPersonIdRef.current = studentId;
              const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              setMatchTimestamp(ts);
              if (student.suspended || student.isSuspended) {
                setStatusState("SUSPENDED"); setActiveMatch(student); playStateAudio("SUSPENDED");
              } else {
                const ds = activeDatasetsRef.current;
                const matched = ds.length > 0 ? ds.find((d) => {
                  const okC = d.classes?.length ? d.classes.includes(student.class) : true;
                  const okS = d.sections?.length ? d.sections.includes(student.section) : true;
                  const okG = d.groups?.length ? d.groups.includes(student.group) : true;
                  return okC && okS && okG;
                }) : null;
                if (!matched) {
                  setStatusState("NOT_IN_SET"); setActiveMatch(student); playStateAudio("NOT_IN_SET");
                } else {
                  const today = new Date().toISOString().split("T")[0];
                  const already = attendanceLogsRef.current.find((l) => (l.studentId === studentId || l.studentId === student.id) && l.date === today);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelsLoaded, screenConfig.mode]);

  const theme = THEMES[statusState] || THEMES.IDLE;
  const isActive = statusState !== "IDLE";
  const StatusIcon = theme.icon;

  // ─── Override Screens ─────────────────────────────────────────────────────
  if (screenConfig.mode !== "NORMAL") {
    return (
      <div className="fixed inset-0 bg-[#030303] flex flex-col font-sans text-white overflow-hidden">
        <OverrideTopBar time={currentTime} />
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-8">
          {screenConfig.mode === "UPDATING" && <UpdatingScreen progress={updateProgress} />}
          {screenConfig.mode === "CLOSED"    && <ClosedScreen />}
          {screenConfig.mode === "DISCONNECTED" && <DisconnectedScreen />}
          {screenConfig.mode === "NO_CAMERA" && <NoCameraScreen />}
          {screenConfig.mode === "MAINTENANCE" && <MaintenanceScreen adminMessage={screenConfig.adminMessage} />}
        </div>
        <OverrideFooter />
      </div>
    );
  }

  // ─── Live Scanner ─────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#030303] flex flex-col font-sans overflow-hidden"
         style={{ color: "white" }}>

      {/* === TOP STATUS BAR === */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        {/* Date */}
        <div className="flex flex-col">
          <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-neutral-500">BIOMETRIC SYSTEM</span>
          <span className="text-xs font-semibold text-neutral-400 tracking-wide">{currentDate}</span>
        </div>
        {/* Status pill */}
        <AnimatePresence mode="wait">
          <motion.div
            key={statusState}
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border"
            style={{
              backgroundColor: isActive ? `${theme.barColor}33` : "#ffffff08",
              borderColor: isActive ? theme.accent : "#ffffff15",
              color: isActive ? theme.accent : "#ffffff55"
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: isActive ? theme.accent : "#ffffff44" }}
            />
            {isActive ? theme.label : "SCANNING"}
          </motion.div>
        </AnimatePresence>
        {/* Clock */}
        <div className="flex flex-col items-end">
          <span className="text-[10px] tracking-[0.2em] uppercase font-semibold text-neutral-500">LOCAL TIME</span>
          <span className="text-xs font-mono font-semibold text-neutral-400">{currentTime}</span>
        </div>
      </div>

      {/* === CAMERA CIRCLE SECTION === */}
      <div className="flex-1 flex flex-col items-center justify-center relative gap-6">

        {/* Ambient glow — behind circle */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: CIRCLE_SIZE + 120,
            height: CIRCLE_SIZE + 120,
            background: `radial-gradient(ellipse at center, ${theme.glow} 0%, transparent 70%)`,
            transition: "background 0.6s ease",
            willChange: "background"
          }}
        />

        {/* Outer wrapper: positions SVG ring exactly on the circle border */}
        <div className="relative">


          {/* Corner reticle brackets */}
          {["top-left","top-right","bottom-left","bottom-right"].map((pos) => {
            const isTop    = pos.startsWith("top");
            const isLeft   = pos.endsWith("left");
            const offset   = -18;
            const bStyle   = { position: "absolute", width: 20, height: 20, borderColor: isActive ? theme.accent : "#ffffff33", transition: "border-color 0.4s ease" };
            return (
              <div key={pos} style={{
                ...bStyle,
                top:    isTop    ? offset : "auto",
                bottom: !isTop   ? offset : "auto",
                left:   isLeft   ? offset : "auto",
                right:  !isLeft  ? offset : "auto",
                borderTopWidth:    isTop    ? 2 : 0,
                borderBottomWidth: !isTop   ? 2 : 0,
                borderLeftWidth:   isLeft   ? 2 : 0,
                borderRightWidth:  !isLeft  ? 2 : 0,
                borderTopLeftRadius:     (isTop && isLeft)   ? 4 : 0,
                borderTopRightRadius:    (isTop && !isLeft)  ? 4 : 0,
                borderBottomLeftRadius:  (!isTop && isLeft)  ? 4 : 0,
                borderBottomRightRadius: (!isTop && !isLeft) ? 4 : 0,
              }} />
            );
          })}

          {/* Circle — video clipped */}
          <div
            className="rounded-full overflow-hidden bg-[#0a0a0a] shadow-2xl relative"
            style={{ width: CIRCLE_SIZE, height: CIRCLE_SIZE }}
          >
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover -scale-x-100"
            />
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none -scale-x-100"
            />

            {/* Idle scan line sweep */}
            {!isActive && (
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${scanLine}%`,
                  height: "2px",
                  background: "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 20%, rgba(255,255,255,0.22) 50%, rgba(255,255,255,0.06) 80%, transparent 100%)",
                  transition: "top 16ms linear"
                }}
              />
            )}

            {/* Active overlay vignette tint */}
            {isActive && (
              <div
                className="absolute inset-0 pointer-events-none rounded-full"
                style={{
                  boxShadow: `inset 0 0 60px ${theme.accent}22`,
                  transition: "box-shadow 0.4s ease"
                }}
              />
            )}
          </div>

          {/* SVG Ring — outside the overflow:hidden div */}
          <svg
            className="absolute pointer-events-none"
            style={{
              top: -4, left: -4,
              width: CIRCLE_SIZE + 8,
              height: CIRCLE_SIZE + 8,
              willChange: "transform"
            }}
            viewBox={`0 0 ${CIRCLE_SIZE + 8} ${CIRCLE_SIZE + 8}`}
          >
            {/* base dim ring always visible */}
            <circle
              cx={(CIRCLE_SIZE + 8) / 2}
              cy={(CIRCLE_SIZE + 8) / 2}
              r={CIRCLE_SIZE / 2 + 1}
              fill="none"
              stroke="#ffffff12"
              strokeWidth="1.5"
            />
            {/* animated status ring */}
            <circle
              cx={(CIRCLE_SIZE + 8) / 2}
              cy={(CIRCLE_SIZE + 8) / 2}
              r={CIRCLE_SIZE / 2 + 1}
              fill="none"
              stroke={isActive ? theme.ring : "transparent"}
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={isActive ? 0 : CIRCUMFERENCE}
              style={{ transition: "stroke-dashoffset 0.65s cubic-bezier(0.4,0,0.2,1), stroke 0.35s ease" }}
              transform={`rotate(-90 ${(CIRCLE_SIZE + 8) / 2} ${(CIRCLE_SIZE + 8) / 2})`}
            />
          </svg>
        </div>

        {/* === FULL RECTANGLE BACKGROUND STATUS BANNER (with shimmer effect) === */}
        <div className="w-full min-h-[52px] flex items-center shrink-0 mt-4">
          <AnimatePresence mode="wait">
            {isActive ? (
              <motion.div
                key={statusState}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -8, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ backgroundColor: theme.barBg }}
                className="w-full py-3.5 px-4 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                {StatusIcon && <StatusIcon className="w-5 h-5 text-white shrink-0" />}
                <span
                  className="t-shimmer text-white font-black tracking-widest uppercase text-center"
                  data-text={theme.label}
                  style={{
                    "--shimmer-base": "rgba(255,255,255,0.85)",
                    "--shimmer-highlight": "#ffffff",
                    "--shimmer-dur": "1800ms"
                  }}
                >
                  {theme.label}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-full flex flex-col items-center justify-center gap-1 py-2"
              >
                <span className="text-[10px] tracking-[0.35em] uppercase text-neutral-700 font-semibold">
                  LOOK INTO CAMERA
                </span>
                <div className="flex gap-1.5 mt-1">
                  {[0,1,2].map((i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-neutral-700"
                      style={{ animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* === BOTTOM INFO PANEL === */}
      <div className="shrink-0 pb-6 pt-2 px-5" style={{ minHeight: 200 }}>
        <AnimatePresence mode="wait">
          {isActive && activeMatch ? (
            <motion.div
              key={`card-${activeMatch.studentId}`}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ willChange: "transform, opacity" }}
            >
              {/* Thin accent divider */}
              <div
                className="h-[2px] rounded-full mb-5"
                style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }}
              />

              {/* Student info row */}
              <div className="flex items-center gap-4 mb-4">
                {/* Avatar */}
                {activeMatch.photoUrl ? (
                  <img
                    src={activeMatch.photoUrl}
                    alt={activeMatch.name}
                    className="w-[68px] h-[68px] rounded-2xl object-cover shadow-xl"
                    style={{ border: `2px solid ${theme.accent}55` }}
                  />
                ) : (
                  <div
                    className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center font-black text-2xl text-white shadow-xl"
                    style={{ background: `${theme.accent}22`, border: `2px solid ${theme.accent}44` }}
                  >
                    {activeMatch.name?.charAt(0).toUpperCase()}
                  </div>
                )}

                {/* Name + ID */}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] tracking-[0.2em] uppercase font-semibold text-neutral-500 mb-0.5">
                    ID · {activeMatch.studentId}
                  </div>
                  <div className="text-[22px] font-black text-white leading-none tracking-tight truncate">
                    {activeMatch.name}
                  </div>
                </div>
              </div>

              {/* Pills row */}
              <div className="flex gap-2 mb-3">
                <div
                  className="flex-1 py-2 px-3 rounded-xl text-center text-[11px] font-black uppercase tracking-widest"
                  style={{ backgroundColor: "#FF8F0018", border: "1px solid #FF8F0055", color: "#FF8F00" }}
                >
                  {activeMatch.class} · {activeMatch.section}
                </div>
                <div
                  className="flex-1 py-2 px-3 rounded-xl text-center text-[11px] font-black uppercase tracking-widest"
                  style={{ backgroundColor: "#FF6F0018", border: "1px solid #FF6F0055", color: "#FF6F00" }}
                >
                  GROUP {activeMatch.group}
                </div>
              </div>

              {/* Timestamp */}
              <div
                className="w-full py-2.5 rounded-xl text-center text-[12px] font-black uppercase tracking-widest"
                style={{ backgroundColor: `${theme.accent}15`, border: `1px solid ${theme.accent}40`, color: theme.accent }}
              >
                ⏱ {matchTimestamp}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center justify-center gap-3"
              style={{ minHeight: 160 }}
            >
              <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-700 font-semibold">
                LOOK INTO CAMERA
              </div>
              <div className="flex gap-1.5">
                {[0,1,2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-neutral-700"
                    style={{ animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite` }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="shrink-0 pb-4 text-center">
        <span className="text-[9px] tracking-[0.3em] text-neutral-800 uppercase font-mono">
          BIOMETRIC ATTENDANCE · V 1.2.7
        </span>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

// ─── Override screen sub-components ──────────────────────────────────────────

function OverrideTopBar({ time }) {
  return (
    <div className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-white/5">
      <span className="text-[10px] tracking-[0.25em] uppercase font-semibold text-neutral-600">BIOMETRIC SYSTEM</span>
      <span className="text-xs font-mono text-neutral-500">{time}</span>
    </div>
  );
}

function OverrideFooter() {
  return (
    <div className="pb-4 text-center shrink-0">
      <span className="text-[9px] tracking-[0.3em] text-neutral-800 uppercase font-mono">BIOMETRIC ATTENDANCE · V 1.2.7</span>
    </div>
  );
}

function UpdatingScreen({ progress }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-8 w-full">
      <div className="w-20 h-20 rounded-full border-2 border-[#00C853]/40 bg-[#00C853]/10 flex items-center justify-center">
        <RefreshCw className="w-10 h-10 text-[#00C853] animate-spin" />
      </div>
      <div>
        <h2 className="text-xl font-black tracking-widest uppercase text-white">UPDATING SYSTEM</h2>
        <p className="text-neutral-500 text-xs tracking-widest mt-1 uppercase">SYNCING DATASET &amp; MODELS</p>
      </div>
      <div className="w-full max-w-[260px] space-y-2">
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
          <div className="h-full bg-[#00C853] rounded-full transition-all duration-150" style={{ width: `${Math.min(100, progress)}%` }} />
        </div>
        <div className="flex justify-between text-[10px] font-mono text-neutral-500 px-0.5">
          <span>PROGRESS</span><span className="text-[#00C853]">{Math.min(100, progress)}%</span>
        </div>
      </div>
    </motion.div>
  );
}

function ClosedScreen() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full border border-[#FF6D00]/40 bg-[#FF6D00]/10 flex items-center justify-center">
        <Power className="w-10 h-10 text-[#FF6D00]" />
      </div>
      <div>
        <h2 className="text-xl font-black tracking-widest uppercase text-white">MARKING CLOSED</h2>
        <p className="text-neutral-500 text-xs tracking-widest mt-1 uppercase">Attendance session has ended</p>
      </div>
    </motion.div>
  );
}

function DisconnectedScreen() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full border border-white/20 flex items-center justify-center">
        <WifiOff className="w-10 h-10 text-neutral-300" />
      </div>
      <div>
        <h2 className="text-xl font-black tracking-widest uppercase text-white">DISCONNECTED</h2>
        <p className="text-neutral-500 text-[11px] font-mono tracking-widest mt-2">ERR · 40X2E</p>
      </div>
    </motion.div>
  );
}

function NoCameraScreen() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-6">
      <div className="w-20 h-20 rounded-full border border-[#D32F2F]/40 bg-[#D32F2F]/10 flex items-center justify-center">
        <CameraOff className="w-10 h-10 text-[#D32F2F]" />
      </div>
      <div>
        <h2 className="text-xl font-black tracking-widest uppercase text-white">NO CAMERA</h2>
        <p className="text-neutral-500 text-xs tracking-widest mt-1 uppercase">Check connection &amp; wires</p>
        <p className="text-neutral-700 text-[10px] font-mono mt-2">ERR · 40X2E</p>
      </div>
    </motion.div>
  );
}

function MaintenanceScreen({ adminMessage }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-8 w-full">
      <div className="w-20 h-20 rounded-full border border-[#FFD600]/30 bg-[#FFD600]/08 flex items-center justify-center">
        <AlertTriangle className="w-10 h-10 text-[#FFD600]" />
      </div>
      <div>
        <h2 className="text-xl font-black tracking-widest uppercase text-[#FF6D00]">MAINTENANCE</h2>
        <p className="text-neutral-500 text-xs tracking-widest mt-1 uppercase">System temporarily offline</p>
      </div>
      {adminMessage && (
        <div className="w-full bg-white/[0.03] border border-white/10 rounded-2xl p-5 text-left">
          <div className="text-[9px] tracking-[0.25em] uppercase font-bold text-neutral-600 mb-2">Admin Note</div>
          <div className="text-sm text-neutral-400 leading-relaxed">{adminMessage}</div>
        </div>
      )}
    </motion.div>
  );
}
