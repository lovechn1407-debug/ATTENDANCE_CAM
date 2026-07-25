import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  set, 
  get, 
  push, 
  update, 
  remove, 
  onValue 
} from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCEfGtn8xU-m1VgDOraZAAbIR3NIyG4EJ4",
  authDomain: "attendance-screen.firebaseapp.com",
  databaseURL: "https://attendance-screen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "attendance-screen",
  storageBucket: "attendance-screen.firebasestorage.app",
  messagingSenderId: "524241326913",
  appId: "1:524241326913:web:1621d3e7d74ccd2db207c0",
  measurementId: "G-393RPYFG2J"
};

// Initialize Firebase App singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getDatabase(app);
export const auth = getAuth(app);

// Authenticate anonymously so RTDB requests pass auth checks
if (typeof window !== "undefined") {
  signInAnonymously(auth).catch((err) => {
    console.warn("Anonymous auth note:", err.message);
  });
}

/* ==========================================
   STUDENT SERVICES (Master Database & Suspension)
   ========================================== */

export async function getStudents() {
  try {
    const studentsRef = ref(db, "students");
    const snapshot = await get(studentsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      return Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching students:", error);
    throw error;
  }
}

export function subscribeToStudents(callback) {
  const studentsRef = ref(db, "students");
  return onValue(studentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const studentList = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(studentList);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Students subscription permission error:", error);
  });
}

export async function addStudent(studentData) {
  try {
    const customId = studentData.studentId || studentData.id;
    const studentRef = customId ? ref(db, `students/${customId}`) : push(ref(db, "students"));
    const idToUse = customId || studentRef.key;

    const payload = {
      id: idToUse,
      studentId: studentData.studentId || idToUse,
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
    if (error.message && error.message.includes("PERMISSION_DENIED")) {
      throw new Error("Firebase Database Permission Denied. Please set Firebase Realtime Database Rules to public (read: true, write: true).");
    }
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
    if (error.message && error.message.includes("PERMISSION_DENIED")) {
      throw new Error("Firebase Database Permission Denied. Please set Firebase Realtime Database Rules to public (read: true, write: true).");
    }
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
   ENTRY/EXIT DATASET SERVICES
   ========================================== */

export function subscribeToDatasets(callback) {
  const datasetsRef = ref(db, "datasets");
  return onValue(datasetsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      }));
      callback(list);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Datasets subscription permission error:", error);
  });
}

export async function saveDataset(datasetData) {
  try {
    const newRef = datasetData.id ? ref(db, `datasets/${datasetData.id}`) : push(ref(db, "datasets"));
    const datasetId = datasetData.id || newRef.key;

    const payload = {
      id: datasetId,
      name: datasetData.name || "New Attendance Dataset",
      selectionMode: datasetData.selectionMode || "FILTER",
      studentIds: datasetData.studentIds || [],
      classes: datasetData.classes || [],
      sections: datasetData.sections || [],
      groups: datasetData.groups || [],
      timing: {
        entryTime: datasetData.timing?.entryTime || "08:00",
        maxEntryTime: datasetData.timing?.maxEntryTime || "09:30",
        exitTime: datasetData.timing?.exitTime || "16:00",
        exitEnabled: datasetData.timing?.exitEnabled ?? true
      },
      active: datasetData.active ?? false,
      createdAt: datasetData.createdAt || new Date().toISOString()
    };

    await set(newRef, payload);
    return payload;
  } catch (error) {
    console.error("Error saving dataset:", error);
    if (error.message && error.message.includes("PERMISSION_DENIED")) {
      throw new Error("Firebase Database Permission Denied. Please set Firebase Realtime Database Rules to public (read: true, write: true).");
    }
    throw error;
  }
}

export async function toggleDatasetActive(datasetId, activeStatus) {
  try {
    const datasetRef = ref(db, `datasets/${datasetId}/active`);
    await set(datasetRef, activeStatus);
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
   SCREEN CONFIG OVERRIDE SERVICES
   ========================================== */

export function subscribeToScreenConfig(callback) {
  const configRef = ref(db, "screen_config");
  return onValue(configRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.val());
    } else {
      callback({ mode: "NORMAL", adminMessage: "", reloadId: 0 });
    }
  });
}

export async function updateScreenConfig(configData) {
  try {
    const configRef = ref(db, "screen_config");
    await update(configRef, {
      mode: configData.mode || "NORMAL",
      adminMessage: configData.adminMessage ?? "",
      updatedAt: new Date().toISOString()
    });
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


/* ==========================================
   ATTENDANCE LOG SERVICES (Realtime & Manual Admin Toggle)
   ========================================== */

export async function recordAttendance(logData) {
  try {
    const newLogRef = push(ref(db, "attendance_logs"));
    const payload = {
      id: newLogRef.key,
      studentId: logData.studentId,
      name: logData.name,
      class: logData.class,
      section: logData.section,
      group: logData.group,
      datasetId: logData.datasetId || "default",
      datasetName: logData.datasetName || "General",
      type: logData.type || "ENTRY",
      timestamp: logData.timestamp || new Date().toISOString(),
      formattedTime: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      date: new Date().toISOString().split('T')[0]
    };

    await set(newLogRef, payload);
    return payload;
  } catch (error) {
    console.error("Error recording attendance:", error);
    throw error;
  }
}

export async function removeAttendanceLog(logId) {
  try {
    const logRef = ref(db, `attendance_logs/${logId}`);
    await remove(logRef);
    return true;
  } catch (error) {
    console.error("Error removing attendance log:", error);
    throw error;
  }
}

export function subscribeToAttendanceLogs(callback) {
  const logsRef = ref(db, "attendance_logs");
  return onValue(logsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({
        id: key,
        ...data[key]
      })).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      callback(list);
    } else {
      callback([]);
    }
  });
}
