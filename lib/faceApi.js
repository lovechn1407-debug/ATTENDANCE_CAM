/**
 * Biometric Face Recognition, Landmark & Physical Liveness Engine
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
 * Load face-api models with CDN fallback (including expressions for smile detection)
 */
export async function loadFaceApiModels() {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const api = await getFaceApi();
      if (!api) return false;

      // Primary model path (CDN fallback)
      const MODEL_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/";

      console.log("Loading face recognition, landmark and expression models...");
      await Promise.all([
        api.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        api.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        api.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        api.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        api.nets.faceExpressionNet.loadFromUri(MODEL_URL)
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
 * Compute 128D facial descriptor array with multi-detector fallbacks
 */
export async function extractFaceDescriptor(inputElement) {
  try {
    const api = await getFaceApi();
    if (!api) return null;
    await loadFaceApiModels();

    // 1. Try TinyFaceDetector with sensitive threshold
    let detection = await api
      .detectSingleFace(inputElement, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.20 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    // 2. Fallback to SsdMobilenetv1
    if (!detection) {
      detection = await api
        .detectSingleFace(inputElement, new api.SsdMobilenetv1Options({ minConfidence: 0.20 }))
        .withFaceLandmarks()
        .withFaceDescriptor();
    }

    // 3. Fallback to detectAllFaces and pick largest face box
    if (!detection) {
      const allDetections = await api
        .detectAllFaces(inputElement, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.15 }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (allDetections.length > 0) {
        allDetections.sort((a, b) => (b.detection.box.width * b.detection.box.height) - (a.detection.box.width * a.detection.box.height));
        detection = allDetections[0];
      }
    }

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
 * Detect all faces in a video frame with landmarks and expressions
 */
export async function detectFacesInVideo(videoElement) {
  try {
    const api = await getFaceApi();
    if (!api || !videoElement) return [];
    await loadFaceApiModels();

    const detections = await api
      .detectAllFaces(videoElement, new api.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }))
      .withFaceLandmarks()
      .withFaceExpressions()
      .withFaceDescriptors();

    return detections;
  } catch (error) {
    console.error("Video frame face detection error:", error);
    return [];
  }
}

/**
 * Physical Liveness Pose & Expression Analysis (Smile, Head Turn)
 *
 * Head turn direction is corrected for camera mirror:
 *   The display is CSS-mirrored (-scale-x-100). face-api processes raw frames.
 *   User turns LEFT  → nose goes to raw-image RIGHT (noseRatio > 0.66) → isTurnedLeft
 *   User turns RIGHT → nose goes to raw-image LEFT  (noseRatio < 0.34) → isTurnedRight
 */
export function analyzeLivenessPose(detection) {
  if (!detection || !detection.landmarks) {
    return { isSmiling: false, isTurnedLeft: false, isTurnedRight: false, isHeadTurned: false };
  }

  const landmarks = detection.landmarks;
  const points = landmarks.positions;

  // ── 1. Smile Detection ────────────────────────────────────────────────────
  // ONLY use the faceExpressionNet score. The mouth-ratio geometry fallback
  // fires on neutral open mouths and causes false positives — it is removed.
  let isSmiling = false;
  if (detection.expressions && typeof detection.expressions.happy === "number") {
    isSmiling = detection.expressions.happy >= 0.85;
  }

  // ── 2. Head Turn Detection ────────────────────────────────────────────────
  // Uses nose-tip position relative to jaw width.
  // Direction labels are corrected for the camera mirror effect.
  let isTurnedLeft = false;
  let isTurnedRight = false;
  let isHeadTurned = false;

  if (points && points.length >= 68) {
    const leftJaw  = points[0];   // image-left  (= user's right side due to mirror)
    const rightJaw = points[16];  // image-right (= user's left side due to mirror)
    const noseTip  = points[30];

    const faceWidth = Math.abs(rightJaw.x - leftJaw.x);
    if (faceWidth > 10) {
      const minX = Math.min(leftJaw.x, rightJaw.x);
      const noseRatio = (noseTip.x - minX) / faceWidth;
      // Neutral face: noseRatio ≈ 0.45–0.55

      if (noseRatio > 0.66) {
        // Nose shifted to image-right → USER turned head LEFT (mirror-corrected)
        isTurnedLeft = true;
        isHeadTurned = true;
      } else if (noseRatio < 0.34) {
        // Nose shifted to image-left → USER turned head RIGHT (mirror-corrected)
        isTurnedRight = true;
        isHeadTurned = true;
      }
    }
  }

  return { isSmiling, isTurnedLeft, isTurnedRight, isHeadTurned };
}

/**
 * Calculate Euclidean Distance between two 128D face descriptors
 */
export function calculateEuclideanDistance(descriptor1, descriptor2) {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return 1.0;
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
 */
export function findBestMatch(liveDescriptor, candidateStudents, threshold = 0.48) {
  if (!liveDescriptor || !candidateStudents || candidateStudents.length === 0) {
    return null;
  }

  let bestMatch = null;
  let minDistance = threshold;

  for (const student of candidateStudents) {
    if (!student.descriptor) continue;
    
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
    const points = landmarks.positions;

    ctx.fillStyle = "rgba(0, 230, 118, 0.4)";
    points.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 1.5, 0, 2 * Math.PI);
      ctx.fill();
    });

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    [leftEye, rightEye].forEach(eye => {
      ctx.beginPath();
      ctx.moveTo(eye[0].x, eye[0].y);
      for (let i = 1; i < eye.length; i++) {
        ctx.lineTo(eye[i].x, eye[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(0, 230, 118, 0.35)";
      ctx.fill();
      ctx.strokeStyle = "#00E676";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    });
  });
}
