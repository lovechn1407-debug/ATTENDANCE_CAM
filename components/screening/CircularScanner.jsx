"use client";

import React from "react";
import { Eye, ShieldCheck } from "lucide-react";

export default function CircularScanner({
  videoRef,
  canvasRef,
  isScanning,
  isMatched,
  isAlreadyMarked,
  matchedStudent
}) {
  return (
    <div className="relative w-full max-w-[320px] sm:max-w-[340px] aspect-square mx-auto flex items-center justify-center">
      {/* Outer Glow Ring Animation when Matched */}
      <div
        className={`absolute inset-0 rounded-full transition-all duration-500 ${
          isMatched
            ? isAlreadyMarked
              ? "ring-8 ring-amber-500/80 bg-amber-500/10 scale-105 animate-pulse"
              : "animate-glow-ring ring-8 ring-emerald-500/80 bg-emerald-500/10 scale-105"
            : "border-2 border-dashed border-indigo-300/80"
        }`}
      />

      {/* Radar Scan Rotation Circle when Scanning */}
      {!isMatched && (
        <div className="absolute inset-1.5 rounded-full border-t-2 border-indigo-500 animate-radar-scan opacity-70 pointer-events-none" />
      )}

      {/* Inner Mask Container (Perfect Circle) */}
      <div className="relative w-[88%] h-[88%] rounded-full overflow-hidden border-4 border-white shadow-2xl bg-slate-950 flex items-center justify-center">
        {/* Live Camera Feed */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover rounded-full transform -scale-x-100" // Mirror view
        />

        {/* Real-time Facial Landmark Overlay Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100"
        />

        {/* Retina Eye Landmark Scanner Reticle */}
        {!isMatched && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 border border-indigo-400/40 rounded-full flex items-center justify-center animate-pulse-subtle">
              <div className="w-32 h-32 border border-cyan-400/40 rounded-full border-t-cyan-400 animate-spin" />
              <div className="absolute w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-md shadow-emerald-400 animate-ping" />
            </div>
          </div>
        )}

        {/* Scanner HUD Overlay Badge */}
        <div className="absolute top-4 bg-slate-900/85 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5 backdrop-blur-xs border border-white/20 shadow-md">
          <Eye className="w-3 h-3 text-cyan-400 animate-pulse" />
          <span>Eye & Face Landmark Scanner</span>
        </div>
      </div>
    </div>
  );
}
