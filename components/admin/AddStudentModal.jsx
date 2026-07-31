"use client";

import React, { useState, useRef } from "react";
import { 
  X, 
  Upload, 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  User,
  Hash,
  School,
  Group
} from "lucide-react";
import { uploadToImgBB } from "@/lib/imgbb";
import { addStudent } from "@/lib/firebase";
import { extractFaceDescriptor } from "@/lib/faceApi";

export default function AddStudentModal({ isOpen, onClose }) {
  const [studentId, setStudentId] = useState(`STU_${Math.floor(100000 + Math.random() * 900000)}`);
  const [name, setName] = useState("");
  const [studentClass, setStudentClass] = useState("10");
  const [section, setSection] = useState("A");
  const [group, setGroup] = useState("A");

  // Photo & Biometrics State
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [descriptorStatus, setDescriptorStatus] = useState("idle"); // idle | processing | success | error
  const [extractedDescriptor, setExtractedDescriptor] = useState(null);
  
  // Multi-Angle Enrolment State (Front 0°, Left 30°, Right 30°)
  const [enrolmentStep, setEnrolmentStep] = useState(0); // 0: Front, 1: Left, 2: Right
  const [angleDescriptors, setAngleDescriptors] = useState([]);
  const [anglePreviews, setAnglePreviews] = useState({ front: null, left: null, right: null });

  // Camera state
  const [useCameraMode, setUseCameraMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const imgRef = useRef(null);

  if (!isOpen) return null;

  // Handle Image File Upload
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
        setAnglePreviews({ front: event.target.result, left: null, right: null });
        processBiometricsFromImage(event.target.result, true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Start Live Webcam Capture Mode
  const startCamera = async () => {
    setUseCameraMode(true);
    setEnrolmentStep(0);
    setAngleDescriptors([]);
    setAnglePreviews({ front: null, left: null, right: null });
    setDescriptorStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setErrorMessage("Could not access camera: " + err.message);
      setUseCameraMode(false);
    }
  };

  // Stop Webcam Stream
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    setUseCameraMode(false);
  };

  // Capture Snapshot from Webcam for current Angle Step
  const captureSnapshot = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg");

    setDescriptorStatus("processing");
    setErrorMessage("");

    try {
      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.src = dataUrl;
      await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
      });

      const result = await extractFaceDescriptor(tempImg);
      if (result && result.descriptor) {
        const newDescriptors = [...angleDescriptors, result.descriptor];
        setAngleDescriptors(newDescriptors);

        if (enrolmentStep === 0) {
          setPhotoPreview(dataUrl);
          setPhotoFile(dataUrl);
          setExtractedDescriptor(result.descriptor);
          setAnglePreviews((prev) => ({ ...prev, front: dataUrl }));
          setEnrolmentStep(1);
          setDescriptorStatus("idle");
        } else if (enrolmentStep === 1) {
          setAnglePreviews((prev) => ({ ...prev, left: dataUrl }));
          setEnrolmentStep(2);
          setDescriptorStatus("idle");
        } else if (enrolmentStep === 2) {
          setAnglePreviews((prev) => ({ ...prev, right: dataUrl }));
          setDescriptorStatus("success");
          stopCamera();
        }
      } else {
        setErrorMessage("No clear face detected in snapshot. Please align your face and try again.");
        setDescriptorStatus("error");
      }
    } catch (err) {
      console.error("Biometrics extraction error:", err);
      setDescriptorStatus("error");
      setErrorMessage("Biometric extraction failed: " + err.message);
    }
  };

  // Extract Single Photo Biometrics
  const processBiometricsFromImage = async (imageSrc, isSingle = false) => {
    setDescriptorStatus("processing");
    setErrorMessage("");
    try {
      const tempImg = new Image();
      tempImg.crossOrigin = "anonymous";
      tempImg.src = imageSrc;
      
      await new Promise((resolve, reject) => {
        tempImg.onload = resolve;
        tempImg.onerror = reject;
      });

      const result = await extractFaceDescriptor(tempImg);
      if (result && result.descriptor) {
        setExtractedDescriptor(result.descriptor);
        setAngleDescriptors([result.descriptor]);
        setDescriptorStatus("success");
      } else {
        setExtractedDescriptor(null);
        setAngleDescriptors([]);
        setDescriptorStatus("error");
        setErrorMessage("No clear face detected in photo. Please upload a clear frontal face image.");
      }
    } catch (err) {
      console.error("Biometrics extraction error:", err);
      setDescriptorStatus("error");
      setErrorMessage("Biometric extraction failed: " + err.message);
    }
  };

  // Form Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter the student's name.");
      return;
    }
    if (!photoPreview) {
      setErrorMessage("Please select or capture a student photo.");
      return;
    }
    if (!extractedDescriptor && angleDescriptors.length === 0) {
      setErrorMessage("Cannot add student without verified face biometric descriptor.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // 1. Upload Photo to ImgBB
      console.log("Uploading photo to ImgBB API...");
      const imgbbResult = await uploadToImgBB(photoFile || photoPreview);

      // 2. Save Student to Firebase Realtime Database
      console.log("Saving student to Firebase RTDB...");
      await addStudent({
        studentId: studentId.trim(),
        name: name.trim(),
        class: studentClass.trim(),
        section: section.trim(),
        group: group.trim(),
        photoUrl: imgbbResult.displayUrl,
        descriptor: extractedDescriptor || angleDescriptors[0],
        descriptors: angleDescriptors.length > 0 ? angleDescriptors : [extractedDescriptor]
      });

      // Reset and close
      setIsSubmitting(false);
      onClose();
    } catch (err) {
      console.error("Failed to add student:", err);
      setErrorMessage("Failed to add student: " + err.message);
      setIsSubmitting(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" /> Add New Student
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter student credentials & upload reference biometric photo
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" /> Student ID
              </label>
              <input
                type="text"
                required
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" /> Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <School className="w-3.5 h-3.5 text-slate-400" /> Class & Section
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Class (10)"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
                <input
                  type="text"
                  required
                  placeholder="Sec (A)"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  className="w-24 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
                <Group className="w-3.5 h-3.5 text-slate-400" /> Group Selector
              </label>
              <select
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="A">Group A</option>
                <option value="B">Group B</option>
              </select>
            </div>
          </div>

          {/* Photo & Biometric Section */}
          <div className="space-y-3 pt-2">
            <label className="block text-xs font-semibold text-slate-700 flex items-center justify-between">
              <span>Face Reference Photo (ImgBB + Biometrics)</span>
              {descriptorStatus === "success" && (
                <span className="text-emerald-600 font-semibold text-[11px] flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 128D Landmarks Extracted
                </span>
              )}
            </label>

            {useCameraMode ? (
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-300 aspect-video flex flex-col justify-between p-4">
                {/* Step Directive Header Banner */}
                <div className="bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl p-3 text-white flex items-center justify-between z-10">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
                      Multi-Angle Enrolment Wizard • Step {enrolmentStep + 1} of 3
                    </div>
                    <div className="text-xs font-semibold text-white mt-0.5">
                      {enrolmentStep === 0 && "Look STRAIGHT at the camera (Frontal 0°)"}
                      {enrolmentStep === 1 && "Turn head slightly to the LEFT (~30°)"}
                      {enrolmentStep === 2 && "Turn head slightly to the RIGHT (~30°)"}
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-1.5 font-mono text-[10px]">
                    <span className={`px-2 py-0.5 rounded-md ${anglePreviews.front ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-neutral-800 text-neutral-400"}`}>
                      FRONT {anglePreviews.front ? "✓" : "1"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md ${anglePreviews.left ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-neutral-800 text-neutral-400"}`}>
                      LEFT {anglePreviews.left ? "✓" : "2"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md ${anglePreviews.right ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-neutral-800 text-neutral-400"}`}>
                      RIGHT {anglePreviews.right ? "✓" : "3"}
                    </span>
                  </div>
                </div>

                <video ref={videoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />

                {/* Capture Button Footer */}
                <div className="relative z-10 flex items-center justify-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={captureSnapshot}
                    disabled={descriptorStatus === "processing"}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {descriptorStatus === "processing" ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing Angle...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4" />
                        <span>Capture {enrolmentStep === 0 ? "Front Angle" : enrolmentStep === 1 ? "Left Angle" : "Right Angle"}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="px-4 py-2.5 bg-slate-900/80 hover:bg-slate-800 border border-white/10 text-white font-medium text-xs rounded-xl backdrop-blur-xs"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : photoPreview ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <img
                    src={photoPreview}
                    alt="Student face preview"
                    className="w-20 h-20 rounded-xl object-cover border border-slate-300 shadow-xs"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="text-xs font-medium text-slate-700">
                      {descriptorStatus === "processing" && (
                        <div className="flex items-center gap-2 text-indigo-600">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Analyzing facial landmarks...</span>
                        </div>
                      )}
                      {descriptorStatus === "success" && (
                        <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            {angleDescriptors.length > 1
                              ? `3-Angle Enrolment Verified (${angleDescriptors.length} Descriptors Captured)`
                              : "Single Angle Biometric Descriptor Ready"}
                          </span>
                        </div>
                      )}
                      {descriptorStatus === "error" && (
                        <div className="flex items-center gap-2 text-red-600">
                          <AlertCircle className="w-4 h-4 text-red-600" />
                          <span>No Face Detected. Please re-take or upload clear face.</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium rounded-lg border border-slate-200"
                      >
                        Upload Photo
                      </button>
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5 text-indigo-600" />
                        <span>3-Angle Camera Wizard</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Angle Thumbnails */}
                {angleDescriptors.length > 1 && (
                  <div className="pt-2 border-t border-slate-200/80 flex items-center gap-3">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Angles Enrolled:</span>
                    <div className="flex gap-2 font-mono text-[11px]">
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Front (0°)
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Left (30°)
                      </span>
                      <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Right (30°)
                      </span>
                    </div>
                  </div>
                )}
              </div>

            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                >
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Upload Image File</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG up to 5MB</span>
                </button>

                <button
                  type="button"
                  onClick={startCamera}
                  className="p-6 border-2 border-dashed border-slate-200 hover:border-indigo-500/50 hover:bg-indigo-50/30 rounded-2xl flex flex-col items-center justify-center text-center transition-all group cursor-pointer"
                >
                  <Camera className="w-6 h-6 text-slate-400 group-hover:text-indigo-600 mb-2" />
                  <span className="text-xs font-semibold text-slate-700">Take Live Webcam Photo</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">Use connected camera</span>
                </button>
              </div>
            )}

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || descriptorStatus !== "success"}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-md shadow-indigo-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Firebase & ImgBB...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Save Student Record</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
