"use client";

import React, { useState, useEffect, useRef } from "react";
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
  RefreshCw,
  User
} from "lucide-react";

export default function ScreeningPage() {
  const [students, setStudents] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [activeDatasets, setActiveDatasets] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [screenConfig, setScreenConfig] = useState({ mode: "NORMAL", adminMessage: "", reloadId: 0 });
  
  const [currentTime, setCurrentTime] = useState("");
  const [isModelsLoaded, setIsModelsLoaded] = useState(false);

  // Recognition result states
  // statusState: "IDLE" | "ATTENDANCE_MARKED" | "ATTENDANCE_ALREADY_MARKED" | "NOT_IN_SET" | "TIME_EXCEEDED" | "SUSPENDED" | "FAILED_TO_RECOGNISE"
  const [statusState, setStatusState] = useState("IDLE");
  const [activeMatch, setActiveMatch] = useState(null);
  const [matchTimestamp, setMatchTimestamp] = useState("");

  // Progress Bar for Force Update Screen
  const [updateProgress, setUpdateProgress] = useState(0);

  // Refs for tracking active person in front of camera
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  
  const currentPersonIdRef = useRef(null);
  const lastFaceDetectedTimestampRef = useRef(0);

  // Audio Synthesizer
  const playStateAudio = (state) => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

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
    } catch (e) {
      console.warn("Audio note:", e);
    }
  };

  // Realtime Subscriptions & Clock
  useEffect(() => {
    const unsubStudents = subscribeToStudents(setStudents);
    const unsubDatasets = subscribeToDatasets((data) => {
      setDatasets(data);
      const active = data.filter((d) => d.active === true);
      setActiveDatasets(active);
    });
    const unsubLogs = subscribeToAttendanceLogs(setAttendanceLogs);
    const unsubConfig = subscribeToScreenConfig(setScreenConfig);

    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }, 1000);

    loadFaceApiModels()
      .then(() => setIsModelsLoaded(true))
      .catch((err) => console.error("Face-API models error:", err));

    return () => {
      unsubStudents();
      unsubDatasets();
      unsubLogs();
      unsubConfig();
      clearInterval(timer);
    };
  }, []);

  // Handle Force Update Progress Bar Animation & Hard Reload
  useEffect(() => {
    if (screenConfig.reloadId && screenConfig.mode === "UPDATING") {
      const lastProcessed = sessionStorage.getItem("last_processed_reload_id");
      const currentReloadId = String(screenConfig.reloadId);

      if (lastProcessed !== currentReloadId) {
        sessionStorage.setItem("last_processed_reload_id", currentReloadId);
        setUpdateProgress(0);

        const interval = setInterval(() => {
          setUpdateProgress((prev) => {
            if (prev >= 100) {
              clearInterval(interval);
              updateScreenConfig({ mode: "NORMAL" }).then(() => {
                setTimeout(() => {
                  window.location.reload();
                }, 300);
              });
              return 100;
            }
            return prev + Math.floor(Math.random() * 10) + 5;
          });
        }, 100);

        return () => clearInterval(interval);
      }
    }
  }, [screenConfig.mode, screenConfig.reloadId]);

  // Robust Camera Stream Initialization with Fallback
  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      try {
        const preferredDeviceId = localStorage.getItem("preferred_camera_device_id");
        let stream = null;

        if (preferredDeviceId) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { deviceId: { exact: preferredDeviceId } }
            });
          } catch (e) {
            console.warn("Preferred camera exact match failed, falling back to default video...", e);
          }
        }

        if (!stream) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
          });
        }

        currentStream = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(err => console.log("Video play note:", err));
        }
      } catch (err) {
        console.error("Camera access error:", err);
      }
    };

    if (screenConfig.mode === "NORMAL") {
      startCamera();
    }

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screenConfig.mode]);

  // Real-time Detection & Presence Loop
  useEffect(() => {
    if (!isModelsLoaded || screenConfig.mode !== "NORMAL" || !videoRef.current) return;

    let isProcessing = false;

    const runLoop = async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && !isProcessing) {
        isProcessing = true;
        try {
          const detections = await detectFacesInVideo(videoRef.current);

          if (canvasRef.current) {
            drawEyeAndLandmarkMesh(canvasRef.current, videoRef.current, detections);
          }

          const now = Date.now();

          if (detections.length > 0) {
            lastFaceDetectedTimestampRef.current = now;
            const firstDet = detections[0];
            const liveDescriptor = Array.from(firstDet.descriptor);

            const savedThreshold = localStorage.getItem("face_match_threshold");
            const threshold = savedThreshold ? parseFloat(savedThreshold) : 0.48;

            const matchInMaster = findBestMatch(liveDescriptor, students, threshold);

            if (matchInMaster && matchInMaster.student) {
              const student = matchInMaster.student;
              const studentId = student.studentId || student.id;

              if (currentPersonIdRef.current !== studentId) {
                currentPersonIdRef.current = studentId;
                const formattedNow = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                setMatchTimestamp(formattedNow);

                if (student.suspended || student.isSuspended) {
                  setStatusState("SUSPENDED");
                  setActiveMatch(student);
                  playStateAudio("SUSPENDED");
                } else {
                  let inActiveDataset = false;
                  let datasetObj = null;

                  if (activeDatasets.length > 0) {
                    datasetObj = activeDatasets.find((ds) => {
                      const matchClass = ds.classes?.length ? ds.classes.includes(student.class) : true;
                      const matchSection = ds.sections?.length ? ds.sections.includes(student.section) : true;
                      const matchGroup = ds.groups?.length ? ds.groups.includes(student.group) : true;
                      return matchClass && matchSection && matchGroup;
                    });
                    if (datasetObj) inActiveDataset = true;
                  } else {
                    inActiveDataset = false;
                  }

                  if (!inActiveDataset) {
                    setStatusState("NOT_IN_SET");
                    setActiveMatch(student);
                    playStateAudio("NOT_IN_SET");
                  } else {
                    const todayStr = new Date().toISOString().split("T")[0];
                    const alreadyMarkedToday = attendanceLogs.find(
                      (log) => (log.studentId === studentId || log.studentId === student.id) && log.date === todayStr
                    );

                    if (alreadyMarkedToday) {
                      setStatusState("ATTENDANCE_ALREADY_MARKED");
                      setActiveMatch(student);
                      if (alreadyMarkedToday.formattedTime) {
                        setMatchTimestamp(alreadyMarkedToday.formattedTime);
                      }
                      playStateAudio("ATTENDANCE_ALREADY_MARKED");
                    } else {
                      let timeExceeded = false;
                      if (datasetObj && datasetObj.timing?.maxEntryTime) {
                        const [cutoffHour, cutoffMin] = datasetObj.timing.maxEntryTime.split(":").map(Number);
                        const nowHour = new Date().getHours();
                        const nowMin = new Date().getMinutes();

                        if (nowHour > cutoffHour || (nowHour === cutoffHour && nowMin > cutoffMin)) {
                          timeExceeded = true;
                        }
                      }

                      if (timeExceeded) {
                        setStatusState("TIME_EXCEEDED");
                        setActiveMatch(student);
                        playStateAudio("TIME_EXCEEDED");
                      } else {
                        setStatusState("ATTENDANCE_MARKED");
                        setActiveMatch(student);
                        playStateAudio("ATTENDANCE_MARKED");

                        recordAttendance({
                          studentId: studentId,
                          name: student.name,
                          class: student.class,
                          section: student.section,
                          group: student.group,
                          datasetName: datasetObj ? datasetObj.name : "Master List",
                          type: "ENTRY",
                          timestamp: new Date().toISOString()
                        }).catch((err) => console.error("Log error:", err));
                      }
                    }
                  }
                }
              }
            } else if (firstDet.detection.score < 0.4 && statusState === "IDLE") {
              setStatusState("FAILED_TO_RECOGNISE");
              setActiveMatch(null);
              playStateAudio("FAILED_TO_RECOGNISE");
            }
          } else {
            if (now - lastFaceDetectedTimestampRef.current > 1000) {
              if (currentPersonIdRef.current !== null || statusState !== "IDLE") {
                currentPersonIdRef.current = null;
                setStatusState("IDLE");
                setActiveMatch(null);
              }
            }
          }
        } catch (err) {
          console.error("Loop error:", err);
        } finally {
          isProcessing = false;
        }
      }

      animationFrameRef.current = requestAnimationFrame(runLoop);
    };

    animationFrameRef.current = requestAnimationFrame(runLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isModelsLoaded, students, activeDatasets, attendanceLogs, statusState, screenConfig.mode]);

  // Color & Banner Theme Details
  const getThemeDetails = () => {
    switch (statusState) {
      case "ATTENDANCE_MARKED":
        return {
          strokeColor: "#00C853",
          barBg: "bg-[#00A82D]",
          title: "ATTENDANCE MARKED",
          icon: CheckCircle2,
          tickColor: "bg-[#00C853]"
        };
      case "ATTENDANCE_ALREADY_MARKED":
        return {
          strokeColor: "#1E88E5",
          barBg: "bg-[#1565C0]",
          title: "ATTENDANCE ALREADY MARKED",
          icon: Info,
          tickColor: "bg-[#1E88E5]"
        };
      case "NOT_IN_SET":
        return {
          strokeColor: "#1E88E5",
          barBg: "bg-[#1565C0]",
          title: "NOT IN ATTENDANCE SET",
          icon: Info,
          tickColor: "bg-[#1E88E5]"
        };
      case "TIME_EXCEEDED":
      case "SUSPENDED":
        return {
          strokeColor: "#D32F2F",
          barBg: "bg-[#D32F2F]",
          title: statusState === "TIME_EXCEEDED" ? "TIME EXCEEDED" : "SUSPENDED",
          icon: XCircle,
          tickColor: "bg-[#D32F2F]"
        };
      case "FAILED_TO_RECOGNISE":
        return {
          strokeColor: "#FF6D00",
          barBg: "bg-[#FF6D00]",
          title: "FAILED TO RECOGNISE",
          icon: XCircle,
          tickColor: "bg-[#FF6D00]"
        };
      default:
        return {
          strokeColor: "#333333",
          barBg: "bg-transparent opacity-0",
          title: "SCANNER ACTIVE",
          icon: Info,
          tickColor: "bg-transparent"
        };
    }
  };

  const theme = getThemeDetails();
  const StatusIcon = theme.icon;

  // Render Admin Override Screens (UPDATING, CLOSED, DISCONNECTED, NO_CAMERA, MAINTENANCE)
  if (screenConfig.mode !== "NORMAL") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-0 sm:p-4">
        <div className="w-full max-w-[420px] aspect-[9/16] bg-black overflow-hidden flex flex-col justify-between relative font-sans text-white shadow-2xl">
          {/* Top Bar */}
          <div className="bg-[#111111] px-5 py-3 flex items-center justify-between">
            <Wifi className="w-5 h-5 text-white" />
            <div className="text-white text-sm font-semibold tracking-wide">
              {currentTime || "3:13 PM"}
            </div>
          </div>

          {/* Center Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center space-y-6">
            
            {/* UPDATING SCREEN */}
            {screenConfig.mode === "UPDATING" && (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full space-y-6 flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-full bg-neutral-900 border-4 border-[#00C853] flex items-center justify-center shadow-2xl">
                  <RefreshCw className="w-12 h-12 text-[#00C853] animate-spin" />
                </div>

                <div className="space-y-1">
                  <h2 className="text-2xl font-black tracking-wider text-white uppercase">
                    UPDATING SYSTEM...
                  </h2>
                  <p className="text-neutral-400 text-xs font-semibold tracking-wide">
                    DOWNLOADING DATASET & BIOMETRICS
                  </p>
                </div>

                <div className="w-full max-w-[280px] space-y-2">
                  <div className="w-full h-3.5 bg-neutral-900 rounded-full border border-neutral-700 overflow-hidden p-0.5 shadow-inner">
                    <div 
                      className="h-full bg-[#00C853] rounded-full transition-all duration-150 ease-out shadow-md"
                      style={{ width: `${Math.min(100, updateProgress)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono font-bold px-1">
                    <span className="text-neutral-400 text-[11px]">PROGRESS</span>
                    <span className="text-[#00C853]">{Math.min(100, updateProgress)}%</span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* CLOSED */}
            {screenConfig.mode === "CLOSED" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <Power className="w-28 h-28 text-[#FF6D00]" />
                <h2 className="text-2xl font-black tracking-wider text-white uppercase">
                  ATTENDANCE MARKING CLOSED
                </h2>
              </motion.div>
            )}

            {/* DISCONNECTED */}
            {screenConfig.mode === "DISCONNECTED" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-32 h-32 rounded-full border-4 border-white flex items-center justify-center">
                  <WifiOff className="w-16 h-16 text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase">
                    SERVER DISCONNECTED
                  </h2>
                  <p className="text-neutral-400 text-xs font-mono tracking-widest mt-2 uppercase">
                    ERROR CODE : 40X2E
                  </p>
                </div>
              </motion.div>
            )}

            {/* NO_CAMERA */}
            {screenConfig.mode === "NO_CAMERA" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="w-32 h-32 rounded-full border-4 border-[#D32F2F] flex items-center justify-center">
                  <CameraOff className="w-16 h-16 text-[#D32F2F]" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-wider text-white uppercase">
                    NO WEBCAM DETECTED
                  </h2>
                  <p className="text-neutral-400 text-xs font-semibold tracking-wide mt-1 uppercase">
                    PLEASE CHECK CAMERA AND WIRES
                  </p>
                  <p className="text-neutral-500 text-xs font-mono tracking-widest mt-3 uppercase">
                    ERROR CODE : 40X2E
                  </p>
                </div>
              </motion.div>
            )}

            {/* MAINTENANCE */}
            {screenConfig.mode === "MAINTENANCE" && (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="w-full space-y-8"
              >
                <div className="flex flex-col items-center gap-4">
                  <AlertTriangle className="w-24 h-24 text-[#FFD600]" />
                  <h2 className="text-xl font-black tracking-wider text-[#FF6D00] uppercase">
                    SCREEN IN MAINTANENCE
                  </h2>
                </div>

                <div className="w-full bg-[#181818] p-6 rounded-xl border border-neutral-800 text-left space-y-2">
                  <div className="text-xs font-extrabold text-neutral-300 uppercase tracking-wider">
                    ADMIN MESSAGE
                  </div>
                  <div className="text-sm text-neutral-400 font-medium leading-relaxed">
                    {screenConfig.adminMessage || "System is undergoing scheduled maintenance."}
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="py-4 text-center text-neutral-500 text-[10px] tracking-widest uppercase font-mono border-t border-neutral-900">
            SCREEN ONLINE | CAMERA ID | V 1.2.7
          </div>
        </div>
      </div>
    );
  }

  // Render Normal Live Scanner
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-0 sm:p-4">
      {/* Borderless 9:16 Aspect Container */}
      <div className="w-full max-w-[420px] aspect-[9/16] bg-black overflow-hidden flex flex-col justify-between relative font-sans text-white shadow-2xl">
        
        {/* Top Header Bar */}
        <div className="bg-[#111111] px-5 py-3 flex items-center justify-between z-20">
          <Wifi className="w-5 h-5 text-white" />
          <div className="text-white text-sm font-semibold tracking-wide">
            {currentTime || "3:13 PM"}
          </div>
        </div>

        {/* Center Circular Camera Box */}
        <div className="relative my-auto flex flex-col items-center justify-center">
          
          {/* Animated Upward Tick Icon on top of circle camera */}
          <AnimatePresence>
            {statusState !== "IDLE" && (
              <motion.div
                initial={{ y: 20, opacity: 0, scale: 0.5 }}
                animate={{ y: -16, opacity: 1, scale: 1.1 }}
                exit={{ y: 0, opacity: 0, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className={`absolute top-0 z-30 w-12 h-12 rounded-full ${theme.tickColor} text-white flex items-center justify-center shadow-xl border-2 border-white`}
              >
                <StatusIcon className="w-7 h-7 text-white" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Circular Video Container */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden bg-neutral-900 shadow-2xl flex items-center justify-center border-4 border-neutral-800">
            
            {/* Live Video Feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-full transform -scale-x-100 relative z-0"
            />
            
            {/* Eye Landmark Mesh Overlay */}
            <canvas
              ref={canvasRef}
              className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 z-10"
            />

            {/* SVG Line-Drawing Outer Ring Animation */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-20" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="47"
                fill="none"
                stroke={theme.strokeColor}
                strokeWidth="4"
                strokeDasharray="295"
                strokeDashoffset={statusState !== "IDLE" ? "0" : "295"}
                className="transition-all duration-700 ease-out"
                transform="rotate(-90 50 50)"
              />
            </svg>
          </div>
        </div>

        {/* Status Banner Bar */}
        <div className="w-full min-h-[48px] flex items-center">
          <AnimatePresence mode="wait">
            {statusState !== "IDLE" && (
              <motion.div
                key={statusState}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className={`w-full py-3.5 px-4 ${theme.barBg} text-white font-extrabold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2 shadow-md`}
              >
                <StatusIcon className="w-5 h-5 text-white shrink-0" />
                <span>{theme.title}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Student Profile Details Card */}
        <div className="p-6 min-h-[160px] flex items-end">
          <AnimatePresence mode="wait">
            {statusState !== "IDLE" && activeMatch && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full space-y-4"
              >
                {/* Student Photo & Name */}
                <div className="flex items-center gap-4">
                  {activeMatch.photoUrl ? (
                    <img
                      src={activeMatch.photoUrl}
                      alt={activeMatch.name}
                      className="w-20 h-20 rounded-xl object-cover border border-white/20 shadow-md bg-neutral-800"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-[#666666] border border-white/20 flex items-center justify-center font-bold text-xl text-white">
                      {activeMatch.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                      STU_ID: {activeMatch.studentId}
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-white leading-tight truncate">
                      {activeMatch.name}
                    </div>
                  </div>
                </div>

                {/* Class & Group Side-by-Side Orange Pills */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-[#FF8F00] text-black font-black text-xs py-2 px-3 rounded-lg text-center uppercase tracking-wider">
                    {activeMatch.class} - {activeMatch.section}
                  </div>
                  <div className="flex-1 bg-[#FF6F00] text-black font-black text-xs py-2 px-3 rounded-lg text-center uppercase tracking-wider">
                    GROUP {activeMatch.group}
                  </div>
                </div>

                {/* Full Width Purple Timestamp Button */}
                <div className="w-full bg-[#536DFE] text-white font-black text-sm py-2.5 rounded-xl text-center tracking-wider shadow-md uppercase">
                  [{matchTimestamp}]
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Text */}
        <div className="pb-3 text-center text-neutral-500 text-[10px] tracking-widest uppercase font-mono border-t border-neutral-900 pt-2">
          SCREEN ONLINE | CAMERA ID | V 1.2.7
        </div>
      </div>
    </div>
  );
}
