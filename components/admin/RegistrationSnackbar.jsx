"use client";

import React, { useEffect, useState, useRef } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Sparkles
} from "lucide-react";
import { uploadToImgBB } from "@/lib/imgbb";
import { addStudent } from "@/lib/firebase";
import { extractFaceDescriptor } from "@/lib/faceApi";

// Yields control back to the browser event loop so the UI stays responsive
// during heavy CPU-bound face-api inference tasks.
function yieldToMain() {
  if (typeof scheduler !== "undefined" && scheduler.yield) {
    return scheduler.yield();
  }
  if (typeof requestIdleCallback !== "undefined") {
    return new Promise((resolve) => requestIdleCallback(resolve, { timeout: 50 }));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export default function RegistrationSnackbar({ jobs, onJobComplete, onDismissJob }) {
  if (!jobs || jobs.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full font-sans pointer-events-auto">
      {jobs.map((job) => (
        <SnackbarCard
          key={job.id}
          job={job}
          onJobComplete={onJobComplete}
          onDismissJob={onDismissJob}
        />
      ))}
    </div>
  );
}

function SnackbarCard({ job, onJobComplete, onDismissJob }) {
  const [progress, setProgress] = useState(job.progress || 5);
  const [status, setStatus] = useState(job.status || "processing"); // processing | success | error
  const [statusText, setStatusText] = useState("Queuing for processing...");
  const [errorMessage, setErrorMessage] = useState("");
  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;

    const processRegistration = async () => {
      try {
        // ── STEP 0: Yield immediately so the UI can render the snackbar before we block ──
        await yieldToMain();
        if (cancelledRef.current) return;

        // ── STEP 1: Load images ───────────────────────────────────────────────────
        setProgress(10);
        setStatusText("Loading captured pose images...");
        await yieldToMain();
        if (cancelledRef.current) return;

        const loadedImages = [];
        for (let i = 0; i < job.photos.length; i++) {
          const photoSrc = job.photos[i];
          if (!photoSrc) continue;

          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";
          tempImg.src = photoSrc;

          await new Promise((resolve) => {
            tempImg.onload = resolve;
            tempImg.onerror = resolve; // graceful skip
          });

          // Yield after each image load to keep the UI from stuttering
          await yieldToMain();
          loadedImages.push(tempImg);
        }

        if (cancelledRef.current) return;

        // ── STEP 2: Face descriptor extraction (heavy CPU work, yield between each pose) ──
        setProgress(18);
        setStatusText("Analyzing face pose 1 of 3...");
        await yieldToMain();

        const descriptors = [];
        for (let i = 0; i < loadedImages.length; i++) {
          if (cancelledRef.current) return;

          setProgress(18 + Math.round((i / loadedImages.length) * 25));
          setStatusText(`Extracting face landmarks — pose ${i + 1} of ${loadedImages.length}...`);

          // Yield BEFORE heavy inference so browser can paint status update
          await yieldToMain();

          const result = await extractFaceDescriptor(loadedImages[i]);
          if (result && result.descriptor) {
            descriptors.push(result.descriptor);
          }

          // Yield AFTER inference too
          await yieldToMain();
        }

        if (descriptors.length === 0) {
          throw new Error("Could not detect a face in the captured photos. Please re-take with better lighting and a clear, centred face.");
        }

        if (cancelledRef.current) return;

        // ── STEP 3: Average descriptors for multi-angle accuracy ──────────────────
        setProgress(46);
        setStatusText("Merging multi-angle biometric data...");
        await yieldToMain();

        const finalDescriptor = new Array(128).fill(0);
        for (let i = 0; i < 128; i++) {
          let sum = 0;
          for (let d = 0; d < descriptors.length; d++) {
            sum += descriptors[d][i];
          }
          finalDescriptor[i] = sum / descriptors.length;
        }

        await yieldToMain();
        if (cancelledRef.current) return;

        // ── STEP 4: Upload photo to ImgBB (network I/O — non-blocking) ───────────
        setProgress(52);
        setStatusText("Uploading reference photo to ImgBB...");
        await yieldToMain();

        const imgbbResult = await uploadToImgBB(job.photos[0]);

        if (cancelledRef.current) return;

        // ── STEP 5: Save to Firebase RTDB ─────────────────────────────────────────
        setProgress(82);
        setStatusText("Saving record to Firebase database...");
        await yieldToMain();

        await addStudent({
          studentId: job.studentId,
          name: job.name,
          class: job.studentClass,
          section: job.section,
          group: job.group,
          photoUrl: imgbbResult.displayUrl,
          descriptor: finalDescriptor
        });

        if (cancelledRef.current) return;

        // ── STEP 6: Done ──────────────────────────────────────────────────────────
        setProgress(100);
        setStatus("success");
        setStatusText("Student successfully registered!");
        if (onJobComplete) onJobComplete(job.id);

      } catch (err) {
        console.error("Background registration error:", err);
        if (!cancelledRef.current) {
          setStatus("error");
          setErrorMessage(err.message || "Registration failed");
        }
      }
    };

    // Defer start by 1 frame so the snackbar card renders first before CPU load
    const startTimer = setTimeout(processRegistration, 80);

    return () => {
      cancelledRef.current = true;
      clearTimeout(startTimer);
    };
  }, [job.id]);

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 text-white p-4 rounded-2xl shadow-2xl space-y-3 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/50 text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
            {job.name?.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-white truncate">{job.name}</h4>
            <p className="text-[10px] text-slate-400 font-mono">ID: {job.studentId}</p>
          </div>
        </div>

        <button
          onClick={() => onDismissJob && onDismissJob(job.id)}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {status === "processing" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-indigo-300 font-medium flex items-center gap-1.5 min-w-0">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400 shrink-0" />
              <span className="truncate">{statusText}</span>
            </span>
            <span className="font-mono font-bold text-indigo-400 ml-2 shrink-0">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-200 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "success" && (
        <div className="flex items-center justify-between gap-2 bg-emerald-950/40 border border-emerald-500/40 p-2.5 rounded-xl text-emerald-300 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Added to Database &amp; Biometrics Synced!</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      )}

      {status === "error" && (
        <div className="p-2.5 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs font-medium space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0" /> Registration Failed
          </div>
          <div className="text-[11px] text-red-300/90 leading-tight">{errorMessage}</div>
        </div>
      )}
    </div>
  );
}
