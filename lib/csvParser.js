import Papa from "papaparse";

/**
 * Parse CSV File into normalized college student objects
 * @param {File} file - CSV file object
 * @returns {Promise<Array<{studentId: string, name: string, department: string, course: string, branch: string, section: string, group: string, photoUrl?: string}>>}
 */
export function parseStudentsCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        try {
          const parsedData = results.data.map((row, index) => {
            // Find key by candidate names
            const id = row["id"] || row["studentid"] || row["student_id"] || row["roll"] || `STU_${1000 + index}`;
            const name = row["name"] || row["fullname"] || row["full_name"] || row["student_name"] || "Unknown";
            const department = row["department"] || row["dept"] || "Computer Science";
            const course = row["course"] || row["class"] || row["degree"] || "B.Tech";
            const branch = row["branch"] || row["stream"] || "CSE";
            const section = row["section"] || row["sec"] || "A";
            const group = (row["group"] || row["grp"] || "G1").toUpperCase();
            const photoUrl = row["photourl"] || row["photo"] || row["image"] || row["image_url"] || "";
            const rawSubjects = row["subjects"] || row["subject"] || row["enrolled_subjects"] || "";
            const subjectsList = String(rawSubjects)
              .split(";")
              .flatMap(s => s.split(","))
              .map(s => s.trim())
              .filter(Boolean);

            return {
              studentId: String(id).trim(),
              name: String(name).trim(),
              department: String(department).trim(),
              course: String(course).trim(),
              branch: String(branch).trim(),
              class: String(course).trim(),
              section: String(section).trim(),
              group: String(group).trim(),
              subjects: subjectsList,
              photoUrl: String(photoUrl).trim(),
              descriptor: null
            };
          });

          resolve(parsedData);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Parse CSV File into normalized staff objects with subjects
 * @param {File} file - CSV file object
 * @returns {Promise<Array<{staffId: string, name: string, password?: string, department?: string, subjects: Array<string>}>>}
 */
export function parseStaffsCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
      complete: (results) => {
        try {
          const parsedData = results.data.map((row, index) => {
            const id = row["staffid"] || row["id"] || row["staff_id"] || `STAFF_${100 + index}`;
            const name = row["name"] || row["fullname"] || row["full_name"] || row["staff_name"] || "Faculty Member";
            const password = row["password"] || row["pass"] || "123456";
            const department = row["department"] || row["dept"] || "Computer Science";
            const rawSubjects = row["subjects"] || row["subject"] || row["category"] || "";
            
            const subjectsList = String(rawSubjects)
              .split(";")
              .flatMap(s => s.split(","))
              .map(s => s.trim())
              .filter(Boolean);

            return {
              staffId: String(id).trim().toUpperCase(),
              name: String(name).trim(),
              password: String(password).trim(),
              department: String(department).trim(),
              subjects: subjectsList,
              assignedDatasets: []
            };
          });

          resolve(parsedData);
        } catch (err) {
          reject(err);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

