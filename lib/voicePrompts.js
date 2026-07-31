"use client";

/**
 * BioAttend AI - Kiosk Text-To-Speech (TTS) Voice Prompt Engine
 */

export function getAvailableVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices() || [];
}

export function getDefaultVoicePromptConfig() {
  return {
    enabled: true,
    voiceURI: "",
    volume: 1,
    pitch: 1,
    rate: 1,
    style: "friendly", // "friendly" | "formal" | "brief"
  };
}

export function loadVoicePromptConfig() {
  if (typeof window === "undefined") return getDefaultVoicePromptConfig();
  try {
    const saved = localStorage.getItem("bioattend_voice_config");
    if (saved) {
      return { ...getDefaultVoicePromptConfig(), ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Failed to load voice prompt config:", e);
  }
  return getDefaultVoicePromptConfig();
}

export function saveVoicePromptConfig(config) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("bioattend_voice_config", JSON.stringify(config));
  } catch (e) {
    console.error("Failed to save voice prompt config:", e);
  }
}

export function generateGreetingText(status, studentName = "", style = "friendly") {
  const cleanName = studentName ? studentName.trim() : "Student";
  const firstName = cleanName.split(" ")[0];

  switch (status) {
    case "ATTENDANCE_MARKED":
      if (style === "formal") return `Attendance successfully recorded for ${cleanName}.`;
      if (style === "brief") return `Welcome, ${firstName}.`;
      return `Welcome back, ${firstName}! Your attendance has been logged.`;

    case "ATTENDANCE_ALREADY_MARKED":
      if (style === "formal") return `Attendance has already been logged today for ${cleanName}.`;
      if (style === "brief") return `Already marked today, ${firstName}.`;
      return `Hi ${firstName}, your attendance is already marked for today.`;

    case "TIME_EXCEEDED":
      if (style === "formal") return `Time limit exceeded. Late arrival recorded for ${cleanName}.`;
      if (style === "brief") return `Late arrival, ${firstName}.`;
      return `Attention ${firstName}, entry time limit exceeded.`;

    case "NOT_IN_SET":
      if (style === "formal") return `Student ${cleanName} is not in the active dataset schedule.`;
      if (style === "brief") return `Not in current dataset schedule.`;
      return `Hello ${firstName}, you are not assigned to today's active attendance session.`;

    case "SUSPENDED":
      if (style === "formal") return `Access denied. Student ${cleanName} is currently on suspension.`;
      if (style === "brief") return `Student suspended.`;
      return `Notice for ${firstName}, access is restricted due to active suspension. Please report to the administration office.`;

    case "FAILED_TO_RECOGNISE":
      if (style === "formal") return `Facial recognition failed. Please align with camera scanner.`;
      if (style === "brief") return `Face not recognized.`;
      return `Face not recognized. Please face the camera scanner clearly.`;

    default:
      return `Status updated.`;
  }
}

export function speakGreeting(status, studentName = "", customOptions = {}) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return;
  }

  const config = { ...loadVoicePromptConfig(), ...customOptions };
  if (!config.enabled) return;

  const text = generateGreetingText(status, studentName, config.style);
  if (!text) return;

  try {
    // Cancel any ongoing voice synthesis to avoid queued buildup
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.max(0, Math.min(1, parseFloat(config.volume) || 1));
    utterance.pitch = Math.max(0.5, Math.min(1.5, parseFloat(config.pitch) || 1));
    utterance.rate = Math.max(0.5, Math.min(1.5, parseFloat(config.rate) || 1));

    const voices = getAvailableVoices();
    if (voices.length > 0) {
      let selectedVoice = null;
      if (config.voiceURI) {
        selectedVoice = voices.find((v) => v.voiceURI === config.voiceURI);
      }
      if (!selectedVoice) {
        // Fallback to English voice or default
        selectedVoice = voices.find((v) => v.lang.startsWith("en")) || voices[0];
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
      }
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech Synthesis error:", err);
  }
}
