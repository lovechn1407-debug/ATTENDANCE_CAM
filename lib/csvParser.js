import Papa from "papaparse";

/**
 * Parse CSV File into normalized student objects
 * @param {File} file - CSV file object
 * @returns {Promise<Array<{studentId: string, name: string, class: string, section: string, group: string, photoUrl?: string}>>}
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
            const studentClass = row["class"] || row["grade"] || row["standard"] || "10";
            const section = row["section"] || row["sec"] || "A";
            const group = (row["group"] || row["grp"] || "A").toUpperCase();
            const photoUrl = row["photourl"] || row["photo"] || row["image"] || row["image_url"] || "";

            return {
              studentId: String(id).trim(),
              name: String(name).trim(),
              class: String(studentClass).trim(),
              section: String(section).trim(),
              group: group === "B" ? "B" : "A",
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
