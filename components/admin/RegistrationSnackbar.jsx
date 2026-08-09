"use client";

import React, { useEffect, useState } from "react";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  UserCheck,
  Sparkles
} from "lucide-react";
import { uploadToImgBB } from "@/lib/imgbb";
import { addStudent } from "@/lib/firebase";
import { extractFaceDescriptor, createOptimizedCanvas } from "@/lib/faceApi";

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
  const [progress, setProgress] = useState(job.progress || 10);
  const [status, setStatus] = useState(job.status || "processing"); // processing | success | error
  const [statusText, setStatusText] = useState(job.statusText || "Extracting 3D facial landmarks...");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    const processRegistration = async () => {
      try {
        // Yield control to main UI thread
        await new Promise((r) => setTimeout(r, 20));

        if (!isCancelled) {
          setProgress(15);
          setStatusText("Analyzing 3D facial landmarks...");
        }

        const descriptors = [];
        const poseCount = job.photos.length;

        for (let i = 0; i < poseCount; i++) {
          const photoSrc = job.photos[i];
          if (!photoSrc || isCancelled) continue;

          // Yield UI thread between photo processing
          await new Promise((r) => setTimeout(r, 16));

          const tempImg = new Image();
          tempImg.crossOrigin = "anonymous";
          tempImg.src = photoSrc;

          await new Promise((resolve) => {
            tempImg.onload = resolve;
            tempImg.onerror = resolve; // Graceful skip
          });

          // Downscale to 320px target for lightning fast feature extraction
          const optimizedCanvas = createOptimizedCanvas(tempImg, 320);

          const result = await extractFaceDescriptor(optimizedCanvas);
          if (result && result.descriptor) {
            descriptors.push(result.descriptor);
          }

          if (!isCancelled) {
            const stepProgress = Math.round(15 + ((i + 1) / poseCount) * 35);
            setProgress(stepProgress);
          }
        }

        if (descriptors.length === 0) {
          throw new Error("Could not detect face in captured photos. Please re-take photos with a clear face.");
        }

        // Average descriptors for maximum 3D pose accuracy
        const finalDescriptor = new Array(128).fill(0);
        for (let i = 0; i < 128; i++) {
          let sum = 0;
          for (let d = 0; d < descriptors.length; d++) {
            sum += descriptors[d][i];
          }
          finalDescriptor[i] = sum / descriptors.length;
        }

        await new Promise((r) => setTimeout(r, 20));

        if (!isCancelled) {
          setProgress(55);
          setStatusText("Uploading reference photo to ImgBB...");
        }

        // Upload primary photo to ImgBB
        const primaryPhoto = job.photos[0];
        const imgbbResult = await uploadToImgBB(primaryPhoto);

        await new Promise((r) => setTimeout(r, 20));

        if (!isCancelled) {
          setProgress(85);
          setStatusText("Saving student record to Firebase RTDB...");
        }

        // Save Student to Firebase Realtime Database
        await addStudent({
          studentId: job.studentId,
          name: job.name,
          class: job.studentClass,
          section: job.section,
          group: job.group,
          photoUrl: imgbbResult.displayUrl,
          descriptor: finalDescriptor
        });

        if (!isCancelled) {
          setProgress(100);
          setStatus("success");
          setStatusText("Student successfully registered!");
          if (onJobComplete) onJobComplete(job.id);
        }
      } catch (err) {
        console.error("Background registration error:", err);
        if (!isCancelled) {
          setStatus("error");
          setErrorMessage(err.message || "Registration failed");
        }
      }
    };

    processRegistration();

    return () => {
      isCancelled = true;
    };
  }, [job]);

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
            <span className="text-indigo-300 font-medium flex items-center gap-1.5">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
              <span>{statusText}</span>
            </span>
            <span className="font-mono font-bold text-indigo-400">{progress}%</span>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300 shadow-sm"
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
