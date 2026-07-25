"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  subscribeToStudents, 
  subscribeToDatasets, 
  subscribeToAttendanceLogs, 
  subscribeToScreenConfig,
  updateScreenConfig,
  recordAttendance,
  subscribeToScreens,
  verifyScreenPin,
  updateScreenHeartbeat
} from "@/lib/firebase";
import { detectFacesInVideo, findBestMatch, drawEyeAndLandmarkMesh, loadFaceApiModels } from "@/lib/faceApi";
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  Power, 
  CameraOff, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Lock, 
  Key, 
  LogOut, 
  List, 
  Tv, 
  Calendar, 
  Clock,
  Maximize,
  Minimize
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

// ─── On-Screen Numpad Component (No System Keyboard) ────────────────────────
function OnScreenNumpad({ value, onChange }) {
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "⌫"];

  const handleClick = (digit) => {
    if (digit === "⌫") {
      onChange(value.slice(0, -1));
    } else if (digit === "Clear") {
      onChange("");
    } else {
      if (value.length < 8) {
        onChange(value + digit);
      }
    }
  };

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mx-auto pt-2">
      {digits.map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => handleClick(d)}
          className={`h-13 rounded-2xl font-bold text-lg flex items-center justify-center transition-all select-none active:scale-95 shadow-md ${
            d === "Clear" || d === "⌫"
              ? "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm"
              : "bg-neutral-900 border border-neutral-700/70 text-white hover:bg-neutral-800 hover:border-indigo-500/50"
          }`}
        >
          {d}
        </button>
      ))}
    </div>
  );
}

export default function ScreeningPage() {
  const [students, setStudents] = useState([]);
  const [activeDatasets, setActiveDatasets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [screenConfig, setScreenConfig] = useState({ mode: "NORMAL", adminMessage: "", reloadId: 0, targetScreenIds: ["ALL"] });
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);
  const [statusState, setStatusState] = useState("IDLE");
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchTimestamp, setMatchTimestamp] = useState("");
  const [updateProgress, setUpdateProgress] = useState(0);
  const [scanLine, setScanLine] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Connection & Hardware Hardware States
  const [isOnline, setIsOnline] = useState(true);
  const [hasCameraError, setHasCameraError] = useState(false);

  // ─── Screen Connection Authentication & System States ──────────────────────
  const [availableScreens, setAvailableScreens] = useState([]);
  const [connectedScreenId, setConnectedScreenId] = useState("");
  const [isScreenAuthenticated, setIsScreenAuthenticated] = useState(false);
  
  // Login form states
  const [selectedScreenId, setSelectedScreenId] = useState("");
  const [inputScreenPin, setInputScreenPin] = useState("");
  const [loginErrorMsg, setLoginErrorMsg] = useState("");
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);

  // Settings & Logs Modal states
  const [isPinPromptOpen, setIsPinPromptOpen] = useState(false);
  const [promptInputPin, setPromptInputPin] = useState("");
  const [pinPromptError, setPinPromptError] = useState("");
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [overrideSelectedMode, setOverrideSelectedMode] = useState("NORMAL");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scanLineRef = useRef(null);
  const currentPersonIdRef = useRef(null);
  const lastFaceSeenRef = useRef(0);

  // Live refs so detection loop doesn't recreate
  const studentsRef = useRef([]);
  const activeDatasetsRef = useRef([]);
  const attendanceLogsRef = useRef([]);
  const statusStateRef = useRef("IDLE");
  useEffect(() => { studentsRef.current = students; }, [students]);
  useEffect(() => { activeDatasetsRef.current = activeDatasets; }, [activeDatasets]);
  useEffect(() => { attendanceLogsRef.current = attendanceLogs; }, [attendanceLogs]);
  useEffect(() => { statusStateRef.current = statusState; }, [statusState]);

  // Network Offline / Online listener
  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };
    setIsOnline(navigator.onLine);
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  // Determine if this screen is targeted by override
  const targets = screenConfig.targetScreenIds || ["ALL"];
  const isTargeted = targets.includes("ALL") || targets.includes(connectedScreenId);
  const activeScreenMode = isTargeted ? (screenConfig.mode || "NORMAL") : "NORMAL";

  // Effective Screen Mode considering offline network and camera hardware error
  let effectiveScreenMode = activeScreenMode;
  if (!isOnline) {
    effectiveScreenMode = "DISCONNECTED";
  } else if (hasCameraError && activeScreenMode === "NORMAL") {
    effectiveScreenMode = "NO_CAMERA";
  }

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

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

  // ─── Firebase + Clock + Available Screens Subscription ────────────────────
  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubDatasets = subscribeToDatasets((data) => setActiveDatasets(data.filter((d) => d.active === true)));
    const unsubLogs = subscribeToAttendanceLogs(setAttendanceLogs);
    const unsubConfig = subscribeToScreenConfig(setScreenConfig);
    const unsubScreens = subscribeToScreens((screens) => {
      setAvailableScreens(screens);
      if (screens.length > 0 && !selectedScreenId) {
        setSelectedScreenId(screens[0].screenId);
      }
    });

    // Check saved credentials in localStorage
    const savedScreenId = localStorage.getItem("connected_screen_id");
    const savedScreenPin = localStorage.getItem("connected_screen_pin");
    if (savedScreenId && savedScreenPin) {
      setConnectedScreenId(savedScreenId);
      setIsScreenAuthenticated(true);
    }

    const tick = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
    };
    tick();
    const timer = setInterval(tick, 1000);

    // Heartbeat ping every 15s to keep screen ONLINE in RTDB
    const heartbeatTimer = setInterval(() => {
      const sId = localStorage.getItem("connected_screen_id");
      if (sId) updateScreenHeartbeat(sId);
    }, 15000);

    loadFaceApiModels().then(() => setIsModelsLoaded(true)).catch(console.error);
    return () => { 
      unsubStudents(); 
      unsubDatasets(); 
      unsubLogs(); 
      unsubConfig(); 
      unsubScreens();
      clearInterval(timer);
      clearInterval(heartbeatTimer);
    };
  }, []);

  // ─── Screen Login Handler ─────────────────────────────────────────────────
  const handleConnectScreen = async (e) => {
    if (e) e.preventDefault();
    if (!selectedScreenId || !inputScreenPin) {
      setLoginErrorMsg("Please select a Screen ID and enter the Screen PIN.");
      return;
    }

    setIsSubmittingLogin(true);
    setLoginErrorMsg("");
    try {
      const res = await verifyScreenPin(selectedScreenId, inputScreenPin);
      if (res.success) {
        localStorage.setItem("connected_screen_id", selectedScreenId);
        localStorage.setItem("connected_screen_pin", inputScreenPin);
        setConnectedScreenId(selectedScreenId);
        setIsScreenAuthenticated(true);
        setInputScreenPin("");
      } else {
        setLoginErrorMsg(res.message || "Invalid Screen PIN / Password");
      }
    } catch (err) {
      setLoginErrorMsg("Connection error: " + err.message);
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  // ─── Settings PIN Verification Handler ────────────────────────────────────
  const handleVerifySettingsPin = (e) => {
    if (e) e.preventDefault();
    const savedPin = localStorage.getItem("connected_screen_pin");
    if (String(promptInputPin).trim() === String(savedPin).trim()) {
      setIsPinPromptOpen(false);
      setPromptInputPin("");
      setPinPromptError("");
      setOverrideSelectedMode(effectiveScreenMode);
      setIsSettingsModalOpen(true);
    } else {
      setPinPromptError("Incorrect Screen PIN.");
    }
  };

  // ─── Logout / Disconnect Handler ──────────────────────────────────────────
  const handleLogoutScreen = () => {
    if (confirm("Disconnect and Logout this screen from server?")) {
      localStorage.removeItem("connected_screen_id");
      localStorage.removeItem("connected_screen_pin");
      setIsScreenAuthenticated(false);
      setConnectedScreenId("");
      setIsSettingsModalOpen(false);
      setIsPinPromptOpen(false);
    }
  };

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
    if (screenConfig.reloadId && effectiveScreenMode === "UPDATING") {
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
  }, [effectiveScreenMode, screenConfig.reloadId]);

  // ─── Hardware Camera Start & Failure Detection ────────────────────────────
  useEffect(() => {
    if (effectiveScreenMode !== "NORMAL" || !isScreenAuthenticated) return;
    let stream = null;
    setHasCameraError(false);

    const start = async () => {
      try {
        const pid = localStorage.getItem("preferred_camera_device_id");
        if (pid) { 
          try { 
            stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: pid } } }); 
          } catch {} 
        }
        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } });
        }
        
        if (videoRef.current && stream) { 
          videoRef.current.srcObject = stream; 
          videoRef.current.play().catch(() => {});

          const videoTracks = stream.getVideoTracks();
          if (videoTracks.length > 0) {
            videoTracks[0].onended = () => {
              console.warn("Camera track disconnected");
              setHasCameraError(true);
            };
          } else {
            setHasCameraError(true);
          }
        } else {
          setHasCameraError(true);
        }
      } catch (e) { 
        console.error("Camera output error:", e);
        setHasCameraError(true);
      }
    };

    start();
    return () => { 
      if (stream) stream.getTracks().forEach((t) => t.stop()); 
    };
  }, [effectiveScreenMode, isScreenAuthenticated]);

  // ─── Detection loop ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isModelsLoaded || effectiveScreenMode !== "NORMAL" || !isScreenAuthenticated) return;

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

              if (currentPersonIdRef.current !== studentId) {
                currentPersonIdRef.current = studentId;
                const ts = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setMatchTimestamp(ts);

                if (student.suspended || student.isSuspended) {
                  setStatusState("SUSPENDED"); 
                  setActiveMatch(student); 
                  playStateAudio("SUSPENDED");
                } else {
                  const ds = activeDatasetsRef.current;
                  const matched = ds.length > 0 ? ds.find((d) => {
                    if (d.studentIds && d.studentIds.length > 0) {
                      return d.studentIds.includes(student.studentId || student.id);
                    }
                    const okC = d.classes?.length ? d.classes.includes(student.class) : true;
                    const okS = d.sections?.length ? d.sections.includes(student.section) : true;
                    const okG = d.groups?.length ? d.groups.includes(student.group) : true;
                    return okC && okS && okG;
                  }) : null;

                  if (!matched) {
                    setStatusState("NOT_IN_SET"); 
                    setActiveMatch(student); 
                    playStateAudio("NOT_IN_SET");
                  } else {
                    const today = new Date().toISOString().split("T")[0];
                    const already = attendanceLogsRef.current.find(
                      (l) => (l.studentId === studentId || l.studentId === student.id) && l.date === today
                    );

                    if (already) {
                      setStatusState("ATTENDANCE_ALREADY_MARKED"); 
                      setActiveMatch(student);
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
                        setStatusState("TIME_EXCEEDED"); 
                        setActiveMatch(student); 
                        playStateAudio("TIME_EXCEEDED");
                      } else {
                        setStatusState("ATTENDANCE_MARKED"); 
                        setActiveMatch(student); 
                        playStateAudio("ATTENDANCE_MARKED");
                        recordAttendance({ 
                          studentId, 
                          name: student.name, 
                          class: student.class, 
                          section: student.section, 
                          group: student.group, 
                          datasetName: matched.name || "Master List", 
                          type: "ENTRY", 
                          timestamp: new Date().toISOString() 
                        }).catch(console.error);
                      }
                    }
                  }
                }
              }
            } else {
              if (currentPersonIdRef.current !== "UNKNOWN") {
                currentPersonIdRef.current = "UNKNOWN";
                setStatusState("FAILED_TO_RECOGNISE");
                setActiveMatch(null);
                playStateAudio("FAILED_TO_RECOGNISE");
              }
            }
          } else {
            if (now - lastFaceSeenRef.current > 1000 && (currentPersonIdRef.current !== null || statusStateRef.current !== "IDLE")) {
              currentPersonIdRef.current = null;
              setStatusState("IDLE");
              setActiveMatch(null);
            }
          }
        } catch (e) { 
          console.error("Detection loop error:", e); 
        } finally { 
          processing = false; 
        }
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => { if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelsLoaded, effectiveScreenMode, isScreenAuthenticated]);

  const theme = THEMES[statusState] || THEMES.IDLE;
  const isActive = statusState !== "IDLE";
  const StatusIcon = theme.icon;

  // ─── RENDER SCREEN LOGIN OVERLAY (If not connected/authenticated) ──────────
  if (!isScreenAuthenticated) {
    return (
      <div className="fixed inset-0 bg-[#050505] flex items-center justify-center p-6 text-white font-sans z-50 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-[#111111] border border-neutral-800 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6"
        >
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center mx-auto shadow-lg">
              <Tv className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-black tracking-widest uppercase text-white">
              CONNECT SCREEN TO SERVER
            </h2>
            <p className="text-xs text-neutral-400 font-semibold uppercase tracking-wider">
              Select authorized Screen ID &amp; enter PIN password
            </p>
          </div>

          <div className="space-y-4">
            {loginErrorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-xl text-red-300 text-xs font-semibold text-center">
                {loginErrorMsg}
              </div>
            )}

            {/* Select Screen ID Dropdown */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                Select Screen ID
              </label>
              <select
                value={selectedScreenId}
                onChange={(e) => setSelectedScreenId(e.target.value)}
                className="w-full px-4 py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-sm font-mono font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableScreens.length === 0 ? (
                  <option value="">No screens configured in Admin</option>
                ) : (
                  availableScreens.map((s) => (
                    <option key={s.id} value={s.screenId}>
                      {s.screenId} — {s.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Readonly Display Dots for PIN (No System Keyboard) */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider text-center">
                Enter Screen PIN
              </label>
              <div className="w-full py-3.5 bg-neutral-900 border border-neutral-700 rounded-xl text-center font-mono text-xl font-bold tracking-[0.4em] text-indigo-400">
                {inputScreenPin ? "•".repeat(inputScreenPin.length) : <span className="text-neutral-600 text-xs font-sans tracking-normal font-normal">Touch numpad below</span>}
              </div>
            </div>

            {/* On-Screen Touch Numpad */}
            <OnScreenNumpad value={inputScreenPin} onChange={setInputScreenPin} />

            <button
              onClick={handleConnectScreen}
              disabled={isSubmittingLogin || availableScreens.length === 0 || !inputScreenPin}
              className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-xl shadow-lg transition-all disabled:opacity-40 mt-2"
            >
              {isSubmittingLogin ? "Connecting..." : "Connect Screen"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#030303] flex flex-col font-sans overflow-hidden" style={{ color: "white" }}>
      {/* ─── DYNAMIC VIEW BODY (NORMAL VS OVERRIDE SCREENS) ───────────────── */}
      {effectiveScreenMode !== "NORMAL" ? (
        <div className="flex-1 flex flex-col font-sans text-white overflow-hidden">
          <OverrideTopBar date={currentDate} time={currentTime} screenId={connectedScreenId} />
          <div className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-8">
            {effectiveScreenMode === "UPDATING" && <UpdatingScreen progress={updateProgress} />}
            {effectiveScreenMode === "CLOSED"    && <ClosedScreen />}
            {effectiveScreenMode === "DISCONNECTED" && <DisconnectedScreen />}
            {effectiveScreenMode === "NO_CAMERA" && <NoCameraScreen />}
            {effectiveScreenMode === "MAINTENANCE" && <MaintenanceScreen adminMessage={screenConfig.adminMessage} />}
          </div>
          <OverrideFooter />
        </div>
      ) : (
        <div className="flex-1 flex flex-col font-sans overflow-hidden">
          {/* === TOP STATUS BAR (Dark Greyish-Black Bar) === */}
          <div className="bg-[#0c0c0e]/95 backdrop-blur-md border-b border-white/10 px-5 py-2.5 shrink-0 flex items-center justify-between z-30">
            {/* Left: Screen ID (No overflow) */}
            <div className="min-w-0 max-w-[60%] flex items-center gap-2 shrink">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-sm sm:text-base font-black font-mono text-white tracking-wider uppercase truncate">
                ID: {connectedScreenId || "SCREEN_01"}
              </span>
            </div>

            {/* Right: Date on top, Time lower (No box, small text in corner) */}
            <div className="flex flex-col items-end text-right shrink-0">
              <span className="text-[10px] tracking-wider uppercase font-semibold text-neutral-400">
                {currentDate}
              </span>
              <span className="text-xs font-mono font-bold text-indigo-400 tracking-wide">
                {currentTime}
              </span>
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

              {/* Circle — video clipped with BOLD BORDER when active */}
              <div
                className={`rounded-full overflow-hidden bg-[#0a0a0a] relative transition-all duration-300 ${
                  isActive ? "border-[6px]" : "border-2 border-neutral-800 shadow-2xl"
                }`}
                style={{ 
                  width: CIRCLE_SIZE, 
                  height: CIRCLE_SIZE,
                  borderColor: isActive ? theme.accent : "#262626",
                  boxShadow: isActive ? `0 0 40px ${theme.accent}77` : "0 25px 50px -12px rgba(0, 0, 0, 0.5)"
                }}
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

              {/* SVG Ring — outside the overflow:hidden div with BOLD stroke when active */}
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
                {/* animated status ring (bolder stroke) */}
                <circle
                  cx={(CIRCLE_SIZE + 8) / 2}
                  cy={(CIRCLE_SIZE + 8) / 2}
                  r={CIRCLE_SIZE / 2 + 1}
                  fill="none"
                  stroke={isActive ? theme.ring : "transparent"}
                  strokeWidth={isActive ? "7" : "3"}
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={isActive ? 0 : CIRCUMFERENCE}
                  style={{ transition: "stroke-dashoffset 0.65s cubic-bezier(0.4,0,0.2,1), stroke 0.35s ease, stroke-width 0.3s ease" }}
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
          <div className="shrink-0 pb-6 pt-2 px-5" style={{ minHeight: 210 }}>
            <AnimatePresence mode="wait">
              {isActive && activeMatch ? (
                <motion.div
                  key={`card-${activeMatch.studentId}`}
                  initial={{ opacity: 0, y: 24, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.98 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  style={{ willChange: "transform, opacity" }}
                  className="bg-[#121212] border border-neutral-800 p-5 rounded-2xl shadow-2xl space-y-4 relative overflow-hidden"
                >
                  {/* Subtle accent glow line at top edge */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-[2px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)` }}
                  />

                  {/* Student info row */}
                  <div className="flex items-center gap-4">
                    {/* Avatar */}
                    {activeMatch.photoUrl ? (
                      <img
                        src={activeMatch.photoUrl}
                        alt={activeMatch.name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-2xl bg-neutral-900 border border-white/20 ring-2 ring-indigo-500/30"
                      />
                    ) : (
                      <div
                        className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-2xl border border-white/20"
                        style={{ background: `linear-gradient(135deg, ${theme.accent}33, #1e1e1e)` }}
                      >
                        {activeMatch.name?.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Name + ID Badge */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-white/10 border border-white/10 text-[11px] font-mono font-bold text-neutral-300">
                        <span>STU_ID:</span>
                        <span className="text-white">{activeMatch.studentId}</span>
                      </div>
                      <div className="text-2xl font-black text-white leading-tight tracking-tight truncate">
                        {activeMatch.name}
                      </div>
                    </div>
                  </div>

                  {/* Class & Group Side-by-Side Vibrant Orange Pills */}
                  <div className="flex gap-3">
                    <div className="flex-1 bg-[#FF8F00] text-black font-black text-xs py-2.5 px-3 rounded-xl text-center uppercase tracking-wider shadow-md border border-amber-300/30">
                      {activeMatch.class} - {activeMatch.section}
                    </div>
                    <div className="flex-1 bg-[#FF6F00] text-black font-black text-xs py-2.5 px-3 rounded-xl text-center uppercase tracking-wider shadow-md border border-orange-400/30">
                      GROUP {activeMatch.group}
                    </div>
                  </div>

                  {/* Full Width Purple Timestamp Button */}
                  <div className="w-full bg-[#536DFE] text-white font-black text-sm py-2.5 rounded-xl text-center tracking-wider shadow-lg uppercase border border-indigo-400/30 flex items-center justify-center gap-2">
                    <span>[{matchTimestamp}]</span>
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
                        style={{ animation: `pulse 1.4s ease-in-out ${i * 0.22}s infinite` }}
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
        </div>
      )}

      {/* ─── ALWAYS-VISIBLE FLOATING SETTINGS GEAR BUTTON (BOTTOM RIGHT) ───── */}
      <button
        onClick={() => setIsPinPromptOpen(true)}
        className="fixed bottom-4 right-4 z-40 p-3.5 rounded-2xl bg-[#18181b]/95 border border-white/20 text-neutral-300 hover:text-white shadow-2xl hover:scale-105 active:scale-95 transition-all"
        title="Screen Settings (PIN Protected)"
      >
        <Settings className="w-5 h-5 text-indigo-400" />
      </button>

      {/* ─── MODAL 1: SETTINGS PIN PROMPT OVERLAY (On-Screen Touch Numpad) ──── */}
      {isPinPromptOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-6 text-white font-sans z-50 overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111111] border border-neutral-800 p-6 rounded-3xl max-w-sm w-full shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <Lock className="w-7 h-7 text-indigo-400 mx-auto" />
              <h3 className="text-base font-bold uppercase tracking-wider">ENTER SCREEN PIN</h3>
              <p className="text-xs text-neutral-400">Touch numpad to access settings</p>
            </div>

            <div className="space-y-3">
              {pinPromptError && (
                <div className="p-2 bg-red-950/60 border border-red-500/50 rounded-lg text-red-300 text-xs text-center font-semibold">
                  {pinPromptError}
                </div>
              )}
              
              {/* Display PIN Dots */}
              <div className="w-full py-3 bg-neutral-900 border border-neutral-700 rounded-xl text-center font-mono text-xl font-bold tracking-[0.4em] text-indigo-400">
                {promptInputPin ? "•".repeat(promptInputPin.length) : <span className="text-neutral-600 text-xs font-sans tracking-normal">Enter PIN</span>}
              </div>

              {/* On-Screen Touch Numpad */}
              <OnScreenNumpad value={promptInputPin} onChange={setPromptInputPin} />

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsPinPromptOpen(false); setPromptInputPin(""); setPinPromptError(""); }} className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-xl text-xs font-semibold">
                  Cancel
                </button>
                <button type="button" onClick={handleVerifySettingsPin} disabled={!promptInputPin} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-40">
                  Verify PIN
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL 2: SCREEN SETTINGS & CONTROL MODAL ─────────────────────── */}
      {isSettingsModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-6 text-white font-sans z-50">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111111] border border-neutral-800 p-6 rounded-3xl max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-base font-bold uppercase tracking-wider">SCREEN SETTINGS</h3>
                  <p className="text-xs text-neutral-400 font-mono">ID: {connectedScreenId}</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsModalOpen(false)} className="text-neutral-400 hover:text-white text-xs font-bold px-2.5 py-1.5 bg-neutral-900 rounded-lg">
                Close
              </button>
            </div>

            <div className="space-y-4">
              {/* Screen Mode Remote Override Section */}
              <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-3">
                <div className="text-xs font-bold text-neutral-300 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Tv className="w-4 h-4 text-indigo-400" /> Screen Mode Override</span>
                  <span className="text-[10px] font-mono text-indigo-400">Current: {effectiveScreenMode}</span>
                </div>

                <div className="grid grid-cols-5 gap-1">
                  {[
                    { id: "NORMAL", label: "Live" },
                    { id: "CLOSED", label: "Closed" },
                    { id: "DISCONNECTED", label: "Offline" },
                    { id: "NO_CAMERA", label: "NoCam" },
                    { id: "MAINTENANCE", label: "Maint" }
                  ].map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setOverrideSelectedMode(m.id)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                        overrideSelectedMode === m.id
                          ? "bg-indigo-600 text-white shadow-md"
                          : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={async () => {
                      await updateScreenConfig({
                        mode: overrideSelectedMode,
                        targetScreenIds: [connectedScreenId]
                      });
                      alert(`Override (${overrideSelectedMode}) published for ${connectedScreenId}!`);
                    }}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-xl shadow-sm"
                  >
                    Apply THIS Screen
                  </button>
                  <button
                    onClick={async () => {
                      await updateScreenConfig({
                        mode: overrideSelectedMode,
                        targetScreenIds: ["ALL"]
                      });
                      alert(`Global Override (${overrideSelectedMode}) published for ALL screens!`);
                    }}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold rounded-xl"
                  >
                    Apply ALL Screens
                  </button>
                </div>
              </div>

              {/* Toggle Fullscreen Mode Option */}
              <button
                onClick={toggleFullscreen}
                className="w-full p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  {isFullscreen ? (
                    <Minimize className="w-5 h-5 text-indigo-400" />
                  ) : (
                    <Maximize className="w-5 h-5 text-indigo-400" />
                  )}
                  <div className="text-left">
                    <div className="text-sm font-bold">Toggle Fullscreen Mode</div>
                    <div className="text-xs text-neutral-400">
                      {isFullscreen ? "Fullscreen active (Click to exit)" : "Hide browser address bar & fill display"}
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${isFullscreen ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-neutral-800 text-neutral-400"}`}>
                  {isFullscreen ? "ON" : "OFF"}
                </span>
              </button>

              <button
                onClick={() => { setIsSettingsModalOpen(false); setIsLogsModalOpen(true); }}
                className="w-full p-4 rounded-2xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <List className="w-5 h-5 text-indigo-400" />
                  <div className="text-left">
                    <div className="text-sm font-bold">View Recent Scan Logs</div>
                    <div className="text-xs text-neutral-400">Check latest local attendance logs</div>
                  </div>
                </div>
              </button>

              <button
                onClick={handleLogoutScreen}
                className="w-full p-4 rounded-2xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 flex items-center justify-between transition-all"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-red-400" />
                  <div className="text-left">
                    <div className="text-sm font-bold">Disconnect &amp; Logout Screen</div>
                    <div className="text-xs text-red-400/80">Unlink from server and return to login</div>
                  </div>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── MODAL 3: RECENT LOGS OVERLAY ─────────────────────────────────── */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center p-6 text-white font-sans z-50">
          <div className="bg-[#111111] border border-neutral-800 p-6 rounded-3xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 mb-4">
              <h3 className="text-base font-bold uppercase tracking-wider flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-400" /> Recent Attendance Logs
              </h3>
              <button onClick={() => setIsLogsModalOpen(false)} className="text-neutral-400 hover:text-white text-xs font-bold px-3 py-1.5 bg-neutral-900 rounded-lg">
                Close Logs
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {attendanceLogs.slice(0, 20).map((log) => (
                <div key={log.id} className="p-3 bg-neutral-900 rounded-xl border border-neutral-800 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-white">{log.name}</div>
                    <div className="text-[11px] text-neutral-400 font-mono">ID: {log.studentId} · Class {log.class}-{log.section}</div>
                  </div>
                  <div className="text-right font-mono">
                    <div className="text-emerald-400 font-bold">{log.formattedTime}</div>
                    <div className="text-[10px] text-neutral-500">{log.date}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

function OverrideTopBar({ date, time, screenId }) {
  return (
    <div className="bg-[#0c0c0e]/95 border-b border-white/10 px-5 py-2.5 shrink-0 flex items-center justify-between">
      <div className="min-w-0 max-w-[60%] flex items-center gap-2 shrink">
        <span className="w-2.5 h-2.5 rounded-full bg-[#FF6D00] shrink-0 animate-pulse" />
        <span className="text-sm sm:text-base font-black font-mono text-white tracking-wider uppercase truncate">
          ID: {screenId || "SCREEN_01"}
        </span>
      </div>
      <div className="flex flex-col items-end text-right shrink-0">
        <span className="text-[10px] tracking-wider uppercase font-semibold text-neutral-400">{date}</span>
        <span className="text-xs font-mono font-bold text-indigo-400">{time}</span>
      </div>
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
        <Power className="w-10 h-10 text-neutral-300" />
      </div>
      <div>
        <h2 className="text-xl font-black tracking-widest uppercase text-white">DISCONNECTED</h2>
        <p className="text-neutral-500 text-[11px] font-mono tracking-widest mt-2">SERVER DISCONNECTED · NO INTERNET CONNECTION</p>
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
        <h2 className="text-xl font-black tracking-widest uppercase text-white">NO CAMERA OUTPUT</h2>
        <p className="text-neutral-500 text-xs tracking-widest mt-1 uppercase">Camera hardware missing or disconnected</p>
        <p className="text-neutral-700 text-[10px] font-mono mt-2">ERR · NO_VIDEO_STREAM</p>
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
