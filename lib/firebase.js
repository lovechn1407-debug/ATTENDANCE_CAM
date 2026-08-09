/**
 * Firebase Realtime Database Service Layer for Biometric Attendance System
 */

import { initializeApp, getApps } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push, 
  onValue, 
  update, 
  remove, 
  query, 
  orderByChild,
  equalTo
} from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForDevelopment123456",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "attendence-cam.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://attendence-cam-default-rtdb.firebaseio.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "attendence-cam",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "attendence-cam.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef123456"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export { db };

/* ==========================================
   STUDENT SERVICES
   ========================================== */

export function subscribeToStudents(callback) {
  const studentsRef = ref(db, "students");
  return onValue(studentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const studentList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      }));
      callback(studentList);
    } else {
      callback([]);
    }
  });
}

export async function addStudent(studentData) {
  try {
    const studentRef = ref(db, `students/${studentData.studentId}`);
    
    const payload = {
      id: studentData.studentId,
      studentId: studentData.studentId,
      name: studentData.name || "Unknown Student",
      class: studentData.class || "General",
      section: studentData.section || "A",
      group: studentData.group || "A",
      photoUrl: studentData.photoUrl || "",
      descriptor: studentData.descriptor || null,
      suspended: studentData.suspended || false,
      createdAt: studentData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await set(studentRef, payload);
    return payload;
  } catch (error) {
    console.error("Error adding student:", error);
    throw error;
  }
}

export async function bulkAddStudents(studentsArray) {
  try {
    const updates = {};
    const timestamp = new Date().toISOString();
    
    studentsArray.forEach(student => {
      const idToUse = student.studentId || student.id || `STU_${Math.floor(100000 + Math.random() * 900000)}`;
      updates[`students/${idToUse}`] = {
        id: idToUse,
        studentId: idToUse,
        name: student.name || "Unnamed Student",
        class: student.class || "N/A",
        section: student.section || "A",
        group: student.group || "A",
        photoUrl: student.photoUrl || "",
        descriptor: student.descriptor || null,
        suspended: false,
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error("Error bulk adding students:", error);
    throw error;
  }
}

export async function toggleStudentSuspended(studentId, isSuspended) {
  try {
    const studentRef = ref(db, `students/${studentId}/suspended`);
    await set(studentRef, isSuspended);
    return true;
  } catch (error) {
    console.error("Error toggling student suspension:", error);
    throw error;
  }
}

export async function deleteStudent(studentId) {
  try {
    const studentRef = ref(db, `students/${studentId}`);
    await remove(studentRef);
    return true;
  } catch (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
}

/* ==========================================
   ATTENDANCE LOGS SERVICES
   ========================================== */

export function subscribeToAttendanceLogs(callback) {
  const logsRef = ref(db, "attendance_logs");
  return onValue(logsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const logsList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      callback(logsList);
    } else {
      callback([]);
    }
  });
}

export async function recordAttendance(attendanceData) {
  try {
    const logsRef = ref(db, "attendance_logs");
    const newLogRef = push(logsRef);
    const now = new Date();
    
    const payload = {
      id: newLogRef.key,
      studentId: attendanceData.studentId,
      name: attendanceData.name,
      class: attendanceData.class,
      section: attendanceData.section,
      group: attendanceData.group,
      datasetName: attendanceData.datasetName || "Master List",
      type: attendanceData.type || "ENTRY",
      timestamp: attendanceData.timestamp || now.toISOString(),
      formattedTime: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: now.toISOString().split("T")[0]
    };

    await set(newLogRef, payload);
    return payload;
  } catch (error) {
    console.error("Error recording attendance:", error);
    throw error;
  }
}

export async function deleteAttendanceLog(logId) {
  try {
    const logRef = ref(db, `attendance_logs/${logId}`);
    await remove(logRef);
    return true;
  } catch (error) {
    console.error("Error deleting log:", error);
    throw error;
  }
}

export const removeAttendanceLog = deleteAttendanceLog;

/* ==========================================
   DATASET MANAGEMENT SERVICES
   ========================================== */

export function subscribeToDatasets(callback) {
  const datasetsRef = ref(db, "datasets");
  return onValue(datasetsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const datasetList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      }));
      callback(datasetList);
    } else {
      callback([]);
    }
  });
}

export async function saveDataset(datasetData) {
  try {
    const idToUse = datasetData.id || `DS_${Date.now()}`;
    const datasetRef = ref(db, `datasets/${idToUse}`);

    const payload = {
      id: idToUse,
      name: datasetData.name || "Untitled Dataset",
      classes: datasetData.classes || [],
      sections: datasetData.sections || [],
      groups: datasetData.groups || [],
      studentIds: datasetData.studentIds || [],
      active: datasetData.active !== undefined ? datasetData.active : true,
      timing: datasetData.timing || { maxEntryTime: "10:00" },
      createdAt: datasetData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await set(datasetRef, payload);
    return payload;
  } catch (error) {
    console.error("Error saving dataset:", error);
    throw error;
  }
}

export async function toggleDatasetActive(datasetId, isActive) {
  try {
    const datasetRef = ref(db, `datasets/${datasetId}/active`);
    await set(datasetRef, isActive);
    return true;
  } catch (error) {
    console.error("Error toggling dataset active status:", error);
    throw error;
  }
}

export async function deleteDataset(datasetId) {
  try {
    const datasetRef = ref(db, `datasets/${datasetId}`);
    await remove(datasetRef);
    return true;
  } catch (error) {
    console.error("Error deleting dataset:", error);
    throw error;
  }
}

/* ==========================================
   SCREEN CONFIG & AUTHORIZATION SERVICES
   ========================================== */

export function subscribeToScreenConfig(callback) {
  const configRef = ref(db, "screen_config");
  return onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback({
        mode: data.mode || "NORMAL",
        adminMessage: data.adminMessage || "",
        reloadId: data.reloadId || 0,
        targetScreenIds: data.targetScreenIds || ["ALL"],
        livenessMode: data.livenessMode || "OFF"
      });
    } else {
      callback({ mode: "NORMAL", adminMessage: "", reloadId: 0, targetScreenIds: ["ALL"], livenessMode: "OFF" });
    }
  });
}

export async function updateScreenConfig(configData) {
  try {
    const configRef = ref(db, "screen_config");
    const payload = {};
    if (configData.mode !== undefined) payload.mode = configData.mode;
    if (configData.adminMessage !== undefined) payload.adminMessage = configData.adminMessage;
    if (configData.targetScreenIds !== undefined) payload.targetScreenIds = configData.targetScreenIds;
    if (configData.livenessMode !== undefined) payload.livenessMode = configData.livenessMode;
    if (configData.reloadId !== undefined) payload.reloadId = configData.reloadId;
    payload.updatedAt = new Date().toISOString();

    await update(configRef, payload);
    return true;
  } catch (error) {
    console.error("Error updating screen config:", error);
    throw error;
  }
}

export async function triggerScreenReload() {
  try {
    const configRef = ref(db, "screen_config");
    await update(configRef, {
      reloadId: Date.now(),
      mode: "UPDATING",
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error triggering screen reload:", error);
    throw error;
  }
}

/* Authorized Connected Screens System */
export function subscribeToScreens(callback) {
  const screensRef = ref(db, "screens");
  return onValue(screensRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const screenList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key]
      }));
      callback(screenList);
    } else {
      callback([]);
    }
  });
}

export async function addScreen(screenData) {
  try {
    const screenRef = ref(db, `screens/${screenData.screenId}`);
    const payload = {
      id: screenData.screenId,
      screenId: screenData.screenId,
      name: screenData.name || screenData.screenId,
      password: screenData.password,
      status: "OFFLINE",
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };
    await set(screenRef, payload);
    return payload;
  } catch (error) {
    console.error("Error adding screen:", error);
    throw error;
  }
}

export async function deleteScreen(screenId) {
  try {
    const screenRef = ref(db, `screens/${screenId}`);
    await remove(screenRef);
    return true;
  } catch (error) {
    console.error("Error deleting screen:", error);
    throw error;
  }
}

export async function verifyScreenPin(screenId, inputPin) {
  try {
    const screenRef = ref(db, `screens/${screenId}`);
    const snapshot = await get(screenRef);
    if (snapshot.exists()) {
      const screenData = snapshot.val();
      if (String(screenData.password).trim() === String(inputPin).trim()) {
        await update(screenRef, {
          status: "ONLINE",
          lastSeen: new Date().toISOString()
        });
        return { success: true };
      } else {
        return { success: false, message: "Incorrect Screen PIN / Password." };
      }
    } else {
      return { success: false, message: `Screen ID "${screenId}" not found in server.` };
    }
  } catch (error) {
    console.error("Error verifying screen PIN:", error);
    return { success: false, message: error.message };
  }
}

export async function updateScreenHeartbeat(screenId) {
  try {
    const screenRef = ref(db, `screens/${screenId}`);
    await update(screenRef, {
      status: "ONLINE",
      lastSeen: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Screen heartbeat update failed:", err);
  }
}
