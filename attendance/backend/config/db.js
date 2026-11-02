import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbFilePath = path.join(__dirname, '..', 'data_store.json');

// Initial seeded schema & records
const defaultData = {
  students: [
    {
      id: 1,
      registration_number: "RA2511026020082",
      name: "B.Ganesh",
      department: "AIML",
      year: "2nd Year",
      section: "Sec-B"
    },
    {
      id: 2,
      registration_number: "RA2511026020083",
      name: "Priya Sharma",
      department: "Computer Science",
      year: "3rd Year",
      section: "Sec-A"
    },
    {
      id: 3,
      registration_number: "RA2511026020084",
      name: "Rahul Verma",
      department: "Data Science",
      year: "2nd Year",
      section: "Sec-C"
    },
    {
      id: 4,
      registration_number: "RA2511026020085",
      name: "Ananya Patel",
      department: "Electronics & Comm.",
      year: "4th Year",
      section: "Sec-A"
    },
    {
      id: 5,
      registration_number: "RA2511026020001",
      name: "Arjun Kumar",
      department: "Information Technology",
      year: "1st Year",
      section: "Sec-A"
    }
  ],
  attendance_logs: []
};

// Ensure data file exists
if (!fs.existsSync(dbFilePath)) {
  fs.writeFileSync(dbFilePath, JSON.stringify(defaultData, null, 2), 'utf-8');
  console.log('✅ Created data_store.json with default student database.');
}

const loadData = () => {
  try {
    const raw = fs.readFileSync(dbFilePath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data store, resetting to defaults:', err);
    return defaultData;
  }
};

const saveData = (data) => {
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error persisting data store:', err);
  }
};

export const db = {
  getStudentByRegNo: (regNo) => {
    const data = loadData();
    const clean = regNo.trim().toUpperCase();
    return data.students.find(s => s.registration_number.toUpperCase() === clean);
  },

  getAllStudents: () => {
    const data = loadData();
    return data.students;
  },

  getRecentAttendanceLog: (regNo) => {
    const data = loadData();
    const clean = regNo.trim().toUpperCase();
    const twelveHoursAgo = Date.now() - (12 * 60 * 60 * 1000);
    return data.attendance_logs
      .filter(l => l.registration_number.toUpperCase() === clean)
      .filter(l => new Date(l.timestamp).getTime() > twelveHoursAgo)
      .slice(-1)[0] || null;
  },

  insertAttendanceLog: (logData) => {
    const data = loadData();
    const newEntry = {
      id: data.attendance_logs.length + 1,
      ...logData,
      timestamp: new Date().toISOString()
    };
    data.attendance_logs.unshift(newEntry);
    saveData(data);
    return newEntry;
  },

  getAllAttendanceLogs: () => {
    const data = loadData();
    return data.attendance_logs;
  }
};

export default db;
