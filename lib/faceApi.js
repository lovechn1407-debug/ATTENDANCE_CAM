/**
 * Biometric Face Recognition & Eye-Landmark Detection Engine
 * Uses @vladmandic/face-api
 */

let faceapi = null;
let modelsLoaded = false;
let modelLoadingPromise = null;

/**
 * Dynamically import face-api on the client side (SSR Safe)
 */
async function getFaceApi() {
  if (typeof window === "undefined") return null;
  if (!faceapi) {
    faceapi = await import("@vladmandic/face-api");
  }
  return faceapi;
}

/**
 * Load face-api models with CDN fallback
 */
export async function loadFaceApiModels() {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const api = await getFaceApi();
      if (!api) return false;

      // Primary model path (Local or CDN fallback)
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

      console.log("Loading face recognition and landmark models...");
      await Promise.all([
        api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        api.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      ]);

      modelsLoaded = true;
      console.log("Face-API models loaded successfully!");
      return true;
    } catch (error) {
      console.error("Failed to load Face-API models:", error);
      modelsLoaded = false;
      modelLoadingPromise = null;
      throw error;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Compute 128D facial descriptor array from an image element or video frame
 * @param {HTMLImageElement | HTMLVideoElement | HTMLCanvasElement} inputElement 
 * @returns {Promise<{ descriptor: number[], landmarks: any, detection: any } | null>}
 */
export async function extractFaceDescriptor(inputElement) {
  try {
    const api = await getFaceApi();
    if (!api) return null;
    await loadFaceApiModels();

    const detection = await api
      .detectSingleFace(inputElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return null;
    }

    return {
      descriptor: Array.from(detection.descriptor),
      landmarks: detection.landmarks,
      detection: detection.detection
    };
  } catch (error) {
    console.error("Error extracting face descriptor:", error);
    return null;
  }
}

/**
 * Detect all faces in a video frame (for scanner)
 */
export async function detectFacesInVideo(videoElement) {
  try {
    const api = await getFaceApi();
    if (!api || !videoElement) return [];
    await loadFaceApiModels();

    const detections = await api
      .detectAllFaces(videoElement, new api.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptors();

    return detections;
  } catch (error) {
    console.error("Video frame face detection error:", error);
    return [];
  }
}

/**
 * Calculate Euclidean Distance between two 128D face descriptors
 */
export function calculateEuclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return 1.0; // Max distance
  }
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const diff = descriptor1[i] - descriptor2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Find best matching student for a live face descriptor
 * @param {number[]} liveDescriptor 
 * @param {Array<{id: string, name: string, descriptor: number[]}>} candidateStudents 
 * @param {number} threshold - Match threshold (default 0.48, lower means stricter)
 */
export function findBestMatch(liveDescriptor, candidateStudents, threshold = 0.48) {
  if (!liveDescriptor || !candidateStudents || candidateStudents.length === 0) {
    return null;
  }

  let bestMatch = null;
  let minDistance = threshold;

  for (const student of candidateStudents) {
    if (!student.descriptor) continue;
    
    // Ensure descriptor is array of numbers
    const studentDesc = Array.isArray(student.descriptor) 
      ? student.descriptor 
      : Object.values(student.descriptor);

    const distance = calculateEuclideanDistance(liveDescriptor, studentDesc);
    
    if (distance < minDistance) {
      minDistance = distance;
      bestMatch = {
        student,
        distance,
        confidence: Math.max(0, Math.min(100, Math.round((1 - distance / threshold) * 100)))
      };
    }
  }

  return bestMatch;
}

/**
 * Render 68-point facial mesh with prominent neon highlight on left & right EYE landmarks
 */
export function drawEyeAndLandmarkMesh(canvas, videoElement, detections) {
  if (!canvas || !videoElement || !detections) return;
  
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = videoElement.videoWidth || canvas.width;
  const height = videoElement.videoHeight || canvas.height;

  canvas.width = width;
  canvas.height = height;

  ctx.clearRect(0, 0, width, height);

  detections.forEach(det => {
    const landmarks = det.landmarks;
    if (!landmarks) return;

    const leftEye = landmarks.getLeftEye();   // Array of points for left eye
    const rightEye = landmarks.getRightEye(); // Array of points for right eye

    // Draw eye landmark retina highlight dots (Neon Cyan & Emerald)
    ctx.lineWidth = 2;

    // Draw Left Eye outline & points
    ctx.strokeStyle = "#06b6d4"; // Cyan
    ctx.fillStyle = "#22c55e";   // Emerald
    ctx.beginPath();
    leftEye.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.stroke();

    leftEye.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Draw Right Eye outline & points
    ctx.strokeStyle = "#06b6d4";
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    rightEye.forEach((pt, idx) => {
      if (idx === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.closePath();
    ctx.stroke();

    rightEye.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 3, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Subtle face boundary ring
    const box = det.detection.box;
    ctx.strokeStyle = "rgba(79, 70, 229, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  });
}
