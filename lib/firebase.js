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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCEfGtn8xU-m1VgDOraZAAbIR3NIyG4EJ4",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "attendance-screen.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://attendance-screen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "attendance-screen",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "attendance-screen.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "524241326913",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:524241326913:web:1621d3e7d74ccd2db207c0",
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
   SCREEN CONNECTION & AUTHORIZATION SERVICES
   ========================================== */

export function subscribeToScreens(callback) {
  const screensRef = ref(db, "screens");
  return onValue(screensRef, (snapshot) => {
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
    console.error("Screens subscription error:", error);
  });
}

export async function addScreen(screenData) {
  try {
    const rawId = screenData.screenId.trim().toUpperCase().replace(/\s+/g, "_");
    const screenRef = ref(db, `screens/${rawId}`);
    
    const payload = {
      id: rawId,
      screenId: rawId,
      name: screenData.name || rawId,
      password: String(screenData.password).trim(),
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
      const data = snapshot.val();
      if (String(data.password).trim() === String(inputPin).trim()) {
        await update(screenRef, {
          status: "ONLINE",
          lastSeen: new Date().toISOString()
        });
        return { success: true, screen: data };
      }
    }
    return { success: false, message: "Invalid Screen ID or PIN" };
  } catch (error) {
    console.error("Error verifying screen PIN:", error);
    throw error;
  }
}

export async function updateScreenHeartbeat(screenId) {
  try {
    if (!screenId) return;
    const screenRef = ref(db, `screens/${screenId}`);
    await update(screenRef, {
      status: "ONLINE",
      lastSeen: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Screen heartbeat update failed:", err);
  }
}


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
  }, (error) => {
    console.error("Students subscription permission error:", error);
  });
}

export async function addStudent(studentData) {
  try {
    const customId = studentData.studentId ? studentData.studentId.trim() : null;
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

export const deleteAttendanceLog = removeAttendanceLog;

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

/* ==========================================
   STAFF MANAGEMENT SERVICES
   ========================================== */

export function subscribeToStaffs(callback) {
  const staffsRef = ref(db, "staffs");
  return onValue(staffsRef, (snapshot) => {
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
    console.error("Staffs subscription error:", error);
    callback([]);
  });
}

export async function saveStaff(staffData) {
  try {
    const rawStaffId = staffData.staffId ? staffData.staffId.trim() : null;
    if (!rawStaffId) throw new Error("Staff ID is required");

    const staffRef = ref(db, `staffs/${rawStaffId}`);
    const snapshot = await get(staffRef);
    const existing = snapshot.exists() ? snapshot.val() : {};

    const payload = {
      id: rawStaffId,
      staffId: rawStaffId,
      name: staffData.name ? staffData.name.trim() : "Staff Member",
      password: staffData.password ? String(staffData.password).trim() : "123456",
      assignedDatasets: Array.isArray(staffData.assignedDatasets) ? staffData.assignedDatasets : [],
      createdAt: existing.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await set(staffRef, payload);
    return payload;
  } catch (error) {
    console.error("Error saving staff member:", error);
    throw error;
  }
}

export async function deleteStaff(staffId) {
  try {
    const staffRef = ref(db, `staffs/${staffId}`);
    await remove(staffRef);
    return true;
  } catch (error) {
    console.error("Error deleting staff member:", error);
    throw error;
  }
}

export async function verifyStaffLogin(staffId, inputPassword) {
  try {
    const staffRef = ref(db, `staffs/${staffId.trim()}`);
    const snapshot = await get(staffRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (String(data.password).trim() === String(inputPassword).trim()) {
        return { success: true, staff: data };
      }
    }
    return { success: false, message: "Invalid Staff ID or Password" };
  } catch (error) {
    console.error("Error verifying staff login:", error);
    throw error;
  }
}

/**
 * Record or edit attendance for a student on a specific date (Current or Past)
 */
export async function updateAttendanceForDate({ student, date, status, datasetName, type = "ENTRY" }) {
  try {
    const studentId = student.studentId || student.id;
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Find if an attendance log already exists for this student on targetDate
    const logsRef = ref(db, "attendance_logs");
    const snapshot = await get(logsRef);
    let existingLogId = null;

    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const key in data) {
        if (
          (data[key].studentId === studentId || data[key].studentId === student.id) &&
          data[key].date === targetDate
        ) {
          existingLogId = key;
          break;
        }
      }
    }

    if (status === "ABSENT") {
      // Remove existing log if marking absent
      if (existingLogId) {
        await remove(ref(db, `attendance_logs/${existingLogId}`));
      }
      return { success: true, action: "REMOVED" };
    } else {
      // Mark Present / Custom status
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const payload = {
        studentId: studentId,
        name: student.name || "Unknown",
        class: student.class || "General",
        section: student.section || "A",
        group: student.group || "A",
        datasetId: "staff_edit",
        datasetName: datasetName || "Staff Attendance Panel",
        type: type,
        timestamp: `${targetDate}T${now.toTimeString().split(' ')[0]}.000Z`,
        formattedTime: timeStr,
        date: targetDate,
        updatedByStaff: true
      };

      if (existingLogId) {
        payload.id = existingLogId;
        await update(ref(db, `attendance_logs/${existingLogId}`), payload);
      } else {
        const newLogRef = push(logsRef);
        payload.id = newLogRef.key;
        await set(newLogRef, payload);
      }

      return { success: true, action: "SAVED", log: payload };
    }
  } catch (error) {
    console.error("Error updating attendance for date:", error);
    throw error;
  }
}

