"use client";

/**
 * BioAttend AI - Kiosk Text-To-Speech (TTS) Voice Prompt Engine
 * Optimized for Indian English Accent (en-IN) & Natural Speech Synthesis
 */

export function getAvailableVoices() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return [];
  }
  return window.speechSynthesis.getVoices() || [];
}

export function findBestIndianVoice(voices = []) {
  if (!voices || voices.length === 0) return null;

  // 1. Highest Priority: Natural / Neural Indian English Voices (e.g. Microsoft Neerja Natural, Microsoft Heera, Google English India)
  const premiumIndian = voices.find((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const name = (v.name || "").toLowerCase();
    const isIndian = lang.includes("en-in") || name.includes("india") || name.includes("neerja") || name.includes("heera") || name.includes("prabhat");
    const isNatural = name.includes("natural") || name.includes("online") || name.includes("google") || name.includes("neural");
    return isIndian && isNatural;
  });
  if (premiumIndian) return premiumIndian;

  // 2. Any voice explicitly matching Indian English (en-IN, en_IN, India)
  const indianVoice = voices.find((v) => {
    const lang = (v.lang || "").toLowerCase().replace("_", "-");
    const name = (v.name || "").toLowerCase();
    return lang.includes("en-in") || name.includes("india") || name.includes("neerja") || name.includes("heera") || name.includes("prabhat");
  });
  if (indianVoice) return indianVoice;

  // 3. Fallback to Natural / Neural English Voices
  const naturalEnglish = voices.find((v) => {
    const lang = (v.lang || "").toLowerCase();
    const name = (v.name || "").toLowerCase();
    return lang.startsWith("en") && (name.includes("natural") || name.includes("online") || name.includes("google"));
  });
  if (naturalEnglish) return naturalEnglish;

  // 4. Fallback to any English voice
  return voices.find((v) => (v.lang || "").toLowerCase().startsWith("en")) || voices[0];
}

export function getDefaultVoicePromptConfig() {
  return {
    enabled: true,
    voiceURI: "",
    volume: 1,
    pitch: 1.0,
    rate: 0.95, // Calmer, natural Indian English speech rate
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
      return `Welcome, ${firstName}! Your attendance has been successfully marked.`;

    case "ATTENDANCE_ALREADY_MARKED":
      if (style === "formal") return `Attendance has already been logged today for ${cleanName}.`;
      if (style === "brief") return `Already marked today, ${firstName}.`;
      return `Hello ${firstName}, your attendance was already marked today.`;

    case "TIME_EXCEEDED":
      if (style === "formal") return `Time limit exceeded. Late arrival recorded for ${cleanName}.`;
      if (style === "brief") return `Late arrival, ${firstName}.`;
      return `Attention ${firstName}, late entry recorded. Time limit exceeded.`;

    case "NOT_IN_SET":
      if (style === "formal") return `Student ${cleanName} is not registered in this session's dataset.`;
      if (style === "brief") return `Not in current session.`;
      return `Hello ${firstName}, you are not assigned to today's active attendance session.`;

    case "SUSPENDED":
      if (style === "formal") return `Access denied. Student ${cleanName} is currently on suspension.`;
      if (style === "brief") return `Student suspended.`;
      return `Notice for ${firstName}, access is restricted due to active suspension. Please report to the administration office.`;

    case "FAILED_TO_RECOGNISE":
      if (style === "formal") return `Facial recognition failed. Please align properly with the camera.`;
      if (style === "brief") return `Face not recognized.`;
      return `Face not recognized. Please align your face directly with the scanner.`;

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
    // Cancel any ongoing voice synthesis to prevent overlap
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.max(0, Math.min(1, parseFloat(config.volume) || 1));
    utterance.pitch = Math.max(0.5, Math.min(1.5, parseFloat(config.pitch) || 1.0));
    utterance.rate = Math.max(0.5, Math.min(1.5, parseFloat(config.rate) || 0.95));

    const voices = getAvailableVoices();
    if (voices.length > 0) {
      let selectedVoice = null;
      if (config.voiceURI) {
        selectedVoice = voices.find((v) => v.voiceURI === config.voiceURI);
      }
      if (!selectedVoice) {
        // Automatically select best Indian English (en-IN) voice
        selectedVoice = findBestIndianVoice(voices);
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang || "en-IN";
      } else {
        utterance.lang = "en-IN";
      }
    } else {
      utterance.lang = "en-IN";
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn("Speech Synthesis error:", err);
  }
}

