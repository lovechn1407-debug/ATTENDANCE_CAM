"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Camera, 
  Settings, 
  CheckCircle2, 
  RefreshCw, 
  Video, 
  SlidersHorizontal,
  ShieldCheck,
  Power,
  WifiOff,
  CameraOff,
  AlertTriangle,
  Tv,
  MessageSquare,
  Key,
  Plus,
  Trash2,
  Lock,
  CheckSquare,
  Square,
  Smile,
  Undo2,
  Redo2
} from "lucide-react";
import { 
  subscribeToScreenConfig, 
  updateScreenConfig, 
  subscribeToScreens, 
  addScreen, 
  deleteScreen 
} from "@/lib/firebase";

export default function CameraConfig() {
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");
  const [matchThreshold, setMatchThreshold] = useState(0.48);
  const [isSaved, setIsSaved] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Screen Connection Authorization System State
  const [screensList, setScreensList] = useState([]);
  const [isAddingScreen, setIsAddingScreen] = useState(false);
  const [newScreenId, setNewScreenId] = useState("");
  const [newScreenName, setNewScreenName] = useState("");
  const [newScreenPassword, setNewScreenPassword] = useState("");
  const [addingScreenLoading, setAddingScreenLoading] = useState(false);

  // Screen State Override (Admin Controls)
  const [screenMode, setScreenMode] = useState("NORMAL"); // NORMAL | CLOSED | DISCONNECTED | NO_CAMERA | MAINTENANCE
  const [livenessMode, setLivenessMode] = useState("OFF"); // OFF | SMILE_ONLY | TURN_ONLY | BOTH_RANDOM
  const [adminMessage, setAdminMessage] = useState("");
  const [selectedTargets, setSelectedTargets] = useState(["ALL"]);
  const [savingOverride, setSavingOverride] = useState(false);
  const [overrideSaved, setOverrideSaved] = useState(false);

  const previewVideoRef = useRef(null);

  // Realtime Subscriptions for Screen Config & Connected Screens List
  useEffect(() => {
    const unsubConfig = subscribeToScreenConfig((config) => {
      if (config) {
        setScreenMode(config.mode || "NORMAL");
        setAdminMessage(config.adminMessage || "");
        setSelectedTargets(config.targetScreenIds || ["ALL"]);
        setLivenessMode(config.livenessMode || "OFF");
      }
    });

    const unsubScreens = subscribeToScreens(setScreensList);

    return () => {
      unsubConfig();
      unsubScreens();
    };
  }, []);

  // Load available video cameras
  const fetchCameras = async () => {
    try {
      setErrorMsg("");
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter((d) => d.kind === "videoinput");
      setVideoDevices(cameras);

      const savedDevice = localStorage.getItem("preferred_camera_device_id");
      if (savedDevice && cameras.some((c) => c.deviceId === savedDevice)) {
        setSelectedDeviceId(savedDevice);
      } else if (cameras.length > 0) {
        setSelectedDeviceId(cameras[0].deviceId);
      }

      const savedThreshold = localStorage.getItem("face_match_threshold");
      if (savedThreshold) {
        setMatchThreshold(parseFloat(savedThreshold));
      }
    } catch (err) {
      setErrorMsg("Failed to list cameras: " + err.message);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  // Handle Camera Live Test Preview
  useEffect(() => {
    if (!selectedDeviceId) return;

    let activeStream = null;

    const startTestStream = async () => {
      try {
        if (cameraStream) {
          cameraStream.getTracks().forEach((track) => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedDeviceId } }
        });

        activeStream = stream;
        setCameraStream(stream);

        if (previewVideoRef.current) {
          previewVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera preview error:", err);
      }
    };

    startTestStream();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [selectedDeviceId]);

  const handleSaveConfig = () => {
    localStorage.setItem("preferred_camera_device_id", selectedDeviceId);
    localStorage.setItem("face_match_threshold", matchThreshold.toString());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleToggleTarget = (screenId) => {
    if (screenId === "ALL") {
      setSelectedTargets(["ALL"]);
    } else {
      let updated = selectedTargets.filter((id) => id !== "ALL");
      if (updated.includes(screenId)) {
        updated = updated.filter((id) => id !== screenId);
      } else {
        updated.push(screenId);
      }
      if (updated.length === 0) updated = ["ALL"];
      setSelectedTargets(updated);
    }
  };

  const handleSaveScreenOverride = async () => {
    setSavingOverride(true);
    try {
      await updateScreenConfig({
        mode: screenMode,
        adminMessage: adminMessage.trim(),
        targetScreenIds: selectedTargets,
        livenessMode: livenessMode
      });
      setOverrideSaved(true);
      setTimeout(() => setOverrideSaved(false), 3000);
    } catch (err) {
      alert("Failed to save screen override: " + err.message);
    } finally {
      setSavingOverride(false);
    }
  };

  const handleAddScreen = async (e) => {
    e.preventDefault();
    if (!newScreenId.trim() || !newScreenPassword.trim()) {
      alert("Please provide both a Screen ID and a Screen PIN / Password.");
      return;
    }

    setAddingScreenLoading(true);
    try {
      await addScreen({
        screenId: newScreenId.trim(),
        name: newScreenName.trim() || newScreenId.trim(),
        password: newScreenPassword.trim()
      });

      setNewScreenId("");
      setNewScreenName("");
      setNewScreenPassword("");
      setIsAddingScreen(false);
    } catch (err) {
      alert("Error adding screen: " + err.message);
    } finally {
      setAddingScreenLoading(false);
    }
  };

  const handleDeleteScreen = async (screenId, screenName) => {
    if (confirm(`Remove screen "${screenName || screenId}" from authorization list?`)) {
      try {
        await deleteScreen(screenId);
      } catch (err) {
        alert("Error deleting screen: " + err.message);
      }
    }
  };

  return (
    <div className="space-y-8 max-w-5xl font-sans">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Camera className="w-5 h-5 text-indigo-600" /> Screening Screen &amp; Connection System
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Configure authorized client screens, set Screen PIN passwords, liveness verification, and remotely publish screen overrides.
        </p>
      </div>

      {/* Screen Authorization & Connection Management System */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" /> Authorized Screening Client Connections ({screensList.length})
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Client devices must enter a valid Screen ID and PIN to connect to the biometric server.
            </p>
          </div>

          <button
            onClick={() => setIsAddingScreen(!isAddingScreen)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-sm shadow-indigo-200 flex items-center gap-2 shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{isAddingScreen ? "Cancel" : "Add New Screen"}</span>
          </button>
        </div>

        {/* Add New Screen Form */}
        {isAddingScreen && (
          <form onSubmit={handleAddScreen} className="bg-slate-50 p-5 rounded-2xl border border-indigo-200 shadow-sm space-y-4 animate-in fade-in duration-200">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-indigo-600" /> Create Authorized Screen ID &amp; PIN
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Screen ID (Unique)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SCREEN_01 or GATE_NORTH"
                  value={newScreenId}
                  onChange={(e) => setNewScreenId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Screen Location / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Entrance Gate 1"
                  value={newScreenName}
                  onChange={(e) => setNewScreenName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Set Screen PIN / Password
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1234 or 9876"
                  value={newScreenPassword}
                  onChange={(e) => setNewScreenPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingScreen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addingScreenLoading}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-xs"
              >
                {addingScreenLoading ? "Saving..." : "Authorize Screen"}
              </button>
            </div>
          </form>
        )}

        {/* Authorized Screens List Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {screensList.length === 0 ? (
            <div className="col-span-2 p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400 text-xs">
              No authorized screens created yet. Click "Add New Screen" to create Screen IDs and PINs for client connections.
            </div>
          ) : (
            screensList.map((screen) => {
              const isOnline = screen.status === "ONLINE";
              return (
                <div
                  key={screen.id}
                  className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-900">{screen.screenId}</span>
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" /> ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold border border-slate-300">
                          OFFLINE
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 font-medium">{screen.name}</div>
                    
                    <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                      <span>PIN: <strong className="text-indigo-600">{screen.password}</strong></span>
                      <span>Last Seen: {screen.lastSeen ? new Date(screen.lastSeen).toLocaleTimeString() : "Never"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteScreen(screen.id, screen.name)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all shrink-0"
                    title="Delete Authorized Screen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Screen Mode & Liveness Verification Settings Section */}
      <div className="bg-white p-6 rounded-2xl border border-indigo-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Tv className="w-5 h-5 text-indigo-600" /> Remote Screen Mode &amp; Liveness Config
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select screen state, liveness challenge rules, and publish to active screening clients.
            </p>
          </div>

          {overrideSaved && (
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Config Published!
            </span>
          )}
        </div>

        {/* Override Buttons Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {/* NORMAL */}
          <button
            type="button"
            onClick={() => setScreenMode("NORMAL")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              screenMode === "NORMAL"
                ? "bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold mb-2">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">Live Scanner</div>
              <div className="text-[10px] text-slate-500">Normal Operation</div>
            </div>
          </button>

          {/* CLOSED */}
          <button
            type="button"
            onClick={() => setScreenMode("CLOSED")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              screenMode === "CLOSED"
                ? "bg-orange-50 border-orange-500 text-orange-900 ring-2 ring-orange-500/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold mb-2">
              <Power className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">Marking Closed</div>
              <div className="text-[10px] text-slate-500">Attendance Closed</div>
            </div>
          </button>

          {/* DISCONNECTED */}
          <button
            type="button"
            onClick={() => setScreenMode("DISCONNECTED")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              screenMode === "DISCONNECTED"
                ? "bg-slate-200 border-slate-600 text-slate-900 ring-2 ring-slate-600/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-700 text-white flex items-center justify-center font-bold mb-2">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">Disconnected</div>
              <div className="text-[10px] text-slate-500">Server Offline</div>
            </div>
          </button>

          {/* NO_CAMERA */}
          <button
            type="button"
            onClick={() => setScreenMode("NO_CAMERA")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              screenMode === "NO_CAMERA"
                ? "bg-red-50 border-red-500 text-red-900 ring-2 ring-red-500/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold mb-2">
              <CameraOff className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">No Camera</div>
              <div className="text-[10px] text-slate-500">Camera Disconnected</div>
            </div>
          </button>

          {/* MAINTENANCE */}
          <button
            type="button"
            onClick={() => setScreenMode("MAINTENANCE")}
            className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
              screenMode === "MAINTENANCE"
                ? "bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-500/20"
                : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold mb-2">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs">Maintenance</div>
              <div className="text-[10px] text-slate-500">Admin Notice</div>
            </div>
          </button>
        </div>

        {/* Physical Liveness Verification Mode Selector */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Smile className="w-4 h-4 text-amber-500" /> Physical Liveness Verification Challenge
            </label>
            <span className="text-[11px] font-bold text-indigo-600">
              Active: {livenessMode.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Require scanning users to physically smile or turn their head left/right to confirm attendance presence.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
            {[
              { id: "OFF", label: "OFF (Direct Match)", desc: "Instant attendance", icon: ShieldCheck },
              { id: "SMILE_ONLY", label: "ONLY SMILE", desc: "Smile icon challenge", icon: Smile },
              { id: "TURN_ONLY", label: "ONLY FACE TURN", desc: "Left / Right arrow", icon: Undo2 },
              { id: "BOTH_RANDOM", label: "BOTH RANDOM", desc: "Random prompt", icon: Redo2 }
            ].map((m) => {
              const IconComp = m.icon;
              const isSelected = livenessMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setLivenessMode(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? "bg-indigo-50 border-indigo-600 text-indigo-950 ring-2 ring-indigo-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <IconComp className={`w-5 h-5 mb-2 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                  <div>
                    <div className="font-bold text-xs">{m.label}</div>
                    <div className="text-[10px] text-slate-500">{m.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target Screen Checkbox Selection */}
        <div className="space-y-2 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Select Target Screens to Apply Config (Checkboxes)</span>
            <span className="text-[11px] text-indigo-600 font-normal">
              {selectedTargets.includes("ALL") ? "All Active Screens" : `${selectedTargets.length} Screen(s) Selected`}
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleToggleTarget("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedTargets.includes("ALL")
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              {selectedTargets.includes("ALL") ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
              <span>ALL SCREENS (GLOBAL)</span>
            </button>

            {screensList.map((sc) => {
              const isSelected = selectedTargets.includes(sc.screenId);
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => handleToggleTarget(sc.screenId)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                  }`}
                >
                  {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{sc.screenId}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Admin Message Text Area (For Maintenance mode) */}
        {screenMode === "MAINTENANCE" && (
          <div className="space-y-2 pt-2 animate-in fade-in duration-200">
            <label className="block text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-600" /> Admin Maintenance Message
            </label>
            <textarea
              rows={3}
              placeholder="e.g. System is undergoing scheduled server maintenance. Please wait..."
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        )}

        <div className="flex justify-end">
          <button
            onClick={handleSaveScreenOverride}
            disabled={savingOverride}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <Tv className="w-4 h-4" />
            <span>{savingOverride ? "Publishing..." : "Publish Live Screen State"}</span>
          </button>
        </div>
      </div>

      {/* Hardware Camera & Sensitivity Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Settings Panel */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="w-4 h-4 text-indigo-600" /> Camera &amp; Sensitivity Rules
          </h3>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl">
              {errorMsg}
            </div>
          )}

          {/* Camera Selector Dropdown */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Select Hardware Camera</span>
              <button
                type="button"
                onClick={fetchCameras}
                className="text-indigo-600 hover:underline flex items-center gap-1 text-[11px]"
              >
                <RefreshCw className="w-3 h-3" /> Refresh Devices
              </button>
            </label>

            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
            >
              {videoDevices.length === 0 ? (
                <option value="">No cameras detected</option>
              ) : (
                videoDevices.map((device, idx) => (
                  <option key={device.deviceId || idx} value={device.deviceId}>
                    {device.label || `Camera Hardware ${idx + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Sensitivity Slider */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" /> Biometric Distance Threshold
              </label>
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200">
                {matchThreshold.toFixed(2)}
              </span>
            </div>

            <input
              type="range"
              min="0.30"
              max="0.65"
              step="0.01"
              value={matchThreshold}
              onChange={(e) => setMatchThreshold(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-medium">
              <span>0.30 (Strict Match)</span>
              <span>0.48 (Recommended)</span>
              <span>0.65 (Loose Match)</span>
            </div>
          </div>

          {/* Save Action */}
          <div className="pt-4 flex items-center justify-between border-t border-slate-100">
            {isSaved ? (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Preferences Saved!
              </span>
            ) : (
              <span className="text-xs text-slate-400">Settings persist in browser</span>
            )}

            <button
              onClick={handleSaveConfig}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Save Camera Config
            </button>
          </div>
        </div>

        {/* Live Camera Preview */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Video className="w-4 h-4 text-indigo-600" /> Live Feed Test Box
            </h3>

            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video border border-slate-300 flex items-center justify-center">
              <video
                ref={previewVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-slate-900/80 text-emerald-400 px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Live Camera Active
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
            <p className="font-semibold text-slate-700 mb-0.5">Scanner Screen Integration:</p>
            When you open the Screening Panel, it will automatically connect to this selected hardware camera.
          </div>
        </div>
      </div>
    </div>
  );
}
