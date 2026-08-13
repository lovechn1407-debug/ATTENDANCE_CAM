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

/* ==========================================
   STUDENT SERVICES (College Hierarchy)
   ========================================== */

export function subscribeToStudents(callback) {
  const studentsRef = ref(db, "students");
  return onValue(studentsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const studentList = Object.keys(data).map((key) => ({
        id: key,
        ...data[key],
        // College hierarchy fallbacks
        department: data[key].department || "Computer Science",
        course: data[key].course || data[key].class || "B.Tech",
        branch: data[key].branch || "CSE",
        section: data[key].section || "A",
        group: data[key].group || "G1"
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
      department: studentData.department || "Computer Science",
      course: studentData.course || studentData.class || "B.Tech",
      branch: studentData.branch || "CSE",
      class: studentData.course || studentData.class || "B.Tech", // Backward compatibility
      section: studentData.section || "A",
      group: studentData.group || "G1",
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
        department: student.department || "Computer Science",
        course: student.course || student.class || "B.Tech",
        branch: student.branch || "CSE",
        class: student.course || student.class || "B.Tech",
        section: student.section || "A",
        group: student.group || "G1",
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
   COLLEGE DATASET SERVICES (Subject & Roster Filter)
   ========================================== */

export function subscribeToDatasets(callback) {
  const datasetsRef = ref(db, "datasets");
  return onValue(datasetsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        department: data[key].department || "All",
        course: data[key].course || (data[key].classes ? data[key].classes.join(", ") : "All"),
        branch: data[key].branch || "All",
        section: data[key].section || (data[key].sections ? data[key].sections.join(", ") : "All"),
        group: data[key].group || (data[key].groups ? data[key].groups.join(", ") : "All"),
        subject: data[key].subject || "General"
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
      name: datasetData.name || "New College Dataset",
      selectionMode: datasetData.selectionMode || "FILTER",
      department: datasetData.department || "Computer Science",
      course: datasetData.course || "B.Tech",
      branch: datasetData.branch || "CSE",
      section: datasetData.section || "A",
      group: datasetData.group || "G1",
      subject: datasetData.subject || "General Subject",
      studentIds: datasetData.studentIds || [],
      // Retain array lists for multi-select backwards compatibility
      classes: datasetData.classes || [datasetData.course || "B.Tech"],
      sections: datasetData.sections || [datasetData.section || "A"],
      groups: datasetData.groups || [datasetData.group || "G1"],
      active: datasetData.active ?? true,
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
   LIVE SCREENING PANEL SESSION SERVICES
   ========================================== */

export async function startScreeningSession(sessionData) {
  try {
    const screenId = sessionData.screenId || "SCREEN_01";
    const sessionRef = ref(db, `active_screening_sessions/${screenId}`);
    const sessionId = `SESS_${Date.now()}`;

    const payload = {
      sessionId: sessionId,
      screenId: screenId,
      staffId: sessionData.staffId || "STAFF_01",
      staffName: sessionData.staffName || "Faculty Member",
      subject: sessionData.subject || "General Subject",
      datasetId: sessionData.datasetId || "DEFAULT",
      datasetName: sessionData.datasetName || "Class Roster",
      department: sessionData.department || "Computer Science",
      course: sessionData.course || "B.Tech",
      branch: sessionData.branch || "CSE",
      section: sessionData.section || "A",
      group: sessionData.group || "G1",
      studentIds: sessionData.studentIds || [],
      active: true,
      startedAt: new Date().toISOString()
    };

    await set(sessionRef, payload);
    return payload;
  } catch (error) {
    console.error("Error starting screening session:", error);
    throw error;
  }
}

export async function stopScreeningSession(screenId) {
  try {
    if (!screenId) return;
    const sessionRef = ref(db, `active_screening_sessions/${screenId}`);
    await update(sessionRef, {
      active: false,
      endedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error("Error stopping screening session:", error);
    throw error;
  }
}

export function subscribeToActiveScreeningSession(screenId, callback) {
  if (!screenId) {
    callback(null);
    return () => {};
  }
  const sessionRef = ref(db, `active_screening_sessions/${screenId}`);
  return onValue(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      if (data.active) {
        callback(data);
      } else {
        callback(null);
      }
    } else {
      callback(null);
    }
  }, (error) => {
    console.error("Active screening session subscription error:", error);
    callback(null);
  });
}

export function subscribeToAllScreeningSessions(callback) {
  const sessionsRef = ref(db, "active_screening_sessions");
  return onValue(sessionsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({
        screenId: key,
        ...data[key]
      }));
      callback(list);
    } else {
      callback([]);
    }
  });
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
   PERIOD-WISE ATTENDANCE LOG SERVICES
   ========================================== */

export async function recordAttendance(logData) {
  try {
    const newLogRef = push(ref(db, "attendance_logs"));
    const payload = {
      id: newLogRef.key,
      sessionId: logData.sessionId || "SESS_DIRECT",
      studentId: logData.studentId,
      name: logData.name,
      department: logData.department || "Computer Science",
      course: logData.course || logData.class || "B.Tech",
      branch: logData.branch || "CSE",
      class: logData.course || logData.class || "B.Tech",
      section: logData.section || "A",
      group: logData.group || "G1",
      subject: logData.subject || "General Subject",
      staffId: logData.staffId || "STAFF_01",
      staffName: logData.staffName || "Faculty Member",
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
   STAFF MANAGEMENT & SUBJECT CATEGORY SERVICES
   ========================================== */

export function subscribeToStaffs(callback) {
  const staffsRef = ref(db, "staffs");
  return onValue(staffsRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      const list = Object.keys(data).map(key => ({
        id: key,
        ...data[key],
        department: data[key].department || "Computer Science",
        subjects: Array.isArray(data[key].subjects) ? data[key].subjects : []
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

    let parsedSubjects = [];
    if (Array.isArray(staffData.subjects)) {
      parsedSubjects = staffData.subjects;
    } else if (typeof staffData.subjects === "string") {
      parsedSubjects = staffData.subjects.split(",").map(s => s.trim()).filter(Boolean);
    }

    const payload = {
      id: rawStaffId,
      staffId: rawStaffId,
      name: staffData.name ? staffData.name.trim() : "Staff Member",
      password: staffData.password ? String(staffData.password).trim() : "123456",
      department: staffData.department ? staffData.department.trim() : "Computer Science",
      subjects: parsedSubjects,
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

export async function bulkAddStaffs(staffsArray) {
  try {
    const updates = {};
    const timestamp = new Date().toISOString();
    
    staffsArray.forEach(staff => {
      const idToUse = (staff.staffId || staff.id || `STAFF_${Math.floor(1000 + Math.random() * 9000)}`).toUpperCase();
      let parsedSubjects = [];
      if (Array.isArray(staff.subjects)) {
        parsedSubjects = staff.subjects;
      } else if (typeof staff.subjects === "string") {
        parsedSubjects = staff.subjects.split(",").map(s => s.trim()).filter(Boolean);
      }

      updates[`staffs/${idToUse}`] = {
        id: idToUse,
        staffId: idToUse,
        name: staff.name || "Faculty Member",
        password: String(staff.password || "123456").trim(),
        department: staff.department || "Computer Science",
        subjects: parsedSubjects,
        assignedDatasets: staff.assignedDatasets || [],
        createdAt: timestamp,
        updatedAt: timestamp
      };
    });

    await update(ref(db), updates);
    return true;
  } catch (error) {
    console.error("Error bulk adding staff members:", error);
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
 * Record or edit attendance for a student on a specific date / period session
 */
export async function updateAttendanceForDate({ student, date, status, datasetName, sessionId, subject, staffId, staffName, type = "ENTRY" }) {
  try {
    const studentId = student.studentId || student.id;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const logsRef = ref(db, "attendance_logs");
    const snapshot = await get(logsRef);
    let existingLogId = null;

    if (snapshot.exists()) {
      const data = snapshot.val();
      for (const key in data) {
        const item = data[key];
        const isSameStudent = item.studentId === studentId || item.studentId === student.id;
        const isSameSession = sessionId ? item.sessionId === sessionId : (subject ? item.subject === subject && item.date === targetDate : item.date === targetDate);
        if (isSameStudent && isSameSession) {
          existingLogId = key;
          break;
        }
      }
    }

    if (status === "ABSENT") {
      if (existingLogId) {
        await remove(ref(db, `attendance_logs/${existingLogId}`));
      }
      return { success: true, action: "REMOVED" };
    } else {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const payload = {
        sessionId: sessionId || "SESS_STAFF_EDIT",
        studentId: studentId,
        name: student.name || "Unknown",
        department: student.department || "Computer Science",
        course: student.course || student.class || "B.Tech",
        branch: student.branch || "CSE",
        class: student.course || student.class || "B.Tech",
        section: student.section || "A",
        group: student.group || "G1",
        subject: subject || "General Subject",
        staffId: staffId || "STAFF_01",
        staffName: staffName || "Faculty Member",
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


