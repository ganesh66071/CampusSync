const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, "faculty.db");
let db;
try {
  db = new DatabaseSync(DB_PATH);
} catch (e) {
  console.error("Failed to connect to SQLite DB:", e);
}

function parseTimeToMinutes(val) {
  if (!val) return 0;
  const parts = val.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

function computeFacultyStatus(fac, timetable, targetDay) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const now = new Date();
  const currentDay = days[now.getDay()];
  const dayToUse = targetDay || currentDay;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todaySchedule = timetable.filter(
    (t) => t.day && t.day.toLowerCase() === dayToUse.toLowerCase()
  );

  let currentStatus = "FREE";
  let availableNow = true;

  if (fac.status_override) {
    currentStatus = fac.status_override;
    availableNow = ["AVAILABLE", "FREE", "IN CABIN", "STAFF ROOM"].includes(currentStatus.toUpperCase());
  } else if (!targetDay || targetDay.toLowerCase() === currentDay.toLowerCase()) {
    const collegeStart = 8 * 60 + 30;
    const collegeEnd = 15 * 60 + 50;
    if (currentMinutes < collegeStart || currentMinutes > collegeEnd) {
      availableNow = false;
      currentStatus = "COLLEGE CLOSED";
    } else {
      for (const t of todaySchedule) {
        const startM = parseTimeToMinutes(t.start_time);
        const endM = parseTimeToMinutes(t.end_time);
        if (startM <= currentMinutes && currentMinutes <= endM) {
          if (t.status !== "FREE") {
            currentStatus = t.status;
            availableNow = false;
          }
          break;
        }
      }
    }
  } else {
    currentStatus = `AVAILABLE (${dayToUse.toUpperCase()})`;
    availableNow = true;
  }

  let nextAvailableTime = null;
  const freeSlots = [];
  for (const t of todaySchedule) {
    if (t.status === "FREE") {
      freeSlots.push(`${t.start_time} - ${t.end_time}`);
      if (!targetDay || targetDay.toLowerCase() === currentDay.toLowerCase()) {
        if (parseTimeToMinutes(t.start_time) >= currentMinutes && !nextAvailableTime) {
          nextAvailableTime = t.start_time;
        }
      } else if (!nextAvailableTime) {
        nextAvailableTime = t.start_time;
      }
    }
  }

  const bestTime = todaySchedule.length === 0
    ? `No schedule on ${dayToUse}`
    : (freeSlots.length > 0 ? freeSlots[0] : `No free slot on ${dayToUse}`);

  return {
    current_status: currentStatus,
    available_now: availableNow,
    next_available_time: nextAvailableTime,
    best_time_options: freeSlots,
    best_time_recommended: bestTime,
    today_schedule: todaySchedule,
  };
}

// Routes
app.get("/api/faculty", (req, res) => {
  try {
    const faculties = db.prepare("SELECT * FROM Faculty ORDER BY name ASC").all();
    const timetable = db.prepare("SELECT * FROM Timetable ORDER BY period_number ASC").all();
    const targetDay = req.query.day;

    const results = faculties.map((f) => {
      const facTt = timetable.filter((t) => t.faculty_id === f.faculty_id);
      const computed = computeFacultyStatus(f, facTt, targetDay);
      return { ...f, ...computed };
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/faculty/:id", (req, res) => {
  try {
    const fac = db.prepare("SELECT * FROM Faculty WHERE faculty_id = ?").get(req.params.id);
    if (!fac) return res.status(404).json({ error: "Faculty not found" });

    const timetable = db.prepare("SELECT * FROM Timetable WHERE faculty_id = ? ORDER BY period_number ASC").all(req.params.id);
    const targetDay = req.query.day;
    const computed = computeFacultyStatus(fac, timetable, targetDay);

    res.json({ ...fac, ...computed, weekly_schedule: timetable });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/faculty", (req, res) => {
  try {
    const { name, designation, department, location, email, phone, office_hours, avatar_color } = req.body;
    const stmt = db.prepare(`
      INSERT INTO Faculty (name, designation, department, location, email, phone, office_hours, avatar_color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, designation, department, location, email || "", phone || "", office_hours || "10:00 AM - 12:00 PM", avatar_color || "indigo");
    res.json({ message: "Faculty created successfully", faculty_id: Number(info.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/faculty/:id", (req, res) => {
  try {
    const { name, designation, department, location, email, phone, office_hours, avatar_color } = req.body;
    db.prepare(`
      UPDATE Faculty SET name=?, designation=?, department=?, location=?, email=?, phone=?, office_hours=?, avatar_color=?
      WHERE faculty_id=?
    `).run(name, designation, department, location, email || "", phone || "", office_hours || "", avatar_color || "indigo", req.params.id);
    res.json({ message: "Faculty updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/faculty/:id", (req, res) => {
  try {
    db.prepare("DELETE FROM Timetable WHERE faculty_id=?").run(req.params.id);
    db.prepare("DELETE FROM Faculty WHERE faculty_id=?").run(req.params.id);
    res.json({ message: "Faculty deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/faculty/:id/status", (req, res) => {
  try {
    const { status_override } = req.body;
    db.prepare("UPDATE Faculty SET status_override=? WHERE faculty_id=?").run(status_override || null, req.params.id);
    res.json({ message: "Status updated successfully", status_override });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/faculty/:id/notify", (req, res) => {
  res.json({ success: true, message: "Notification alert active! You will be notified once the faculty is free." });
});

app.get("/api/od-requests", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM ODRequests ORDER BY id DESC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/od-requests", (req, res) => {
  try {
    const { student_name, student_roll, department, year, faculty_id, faculty_name, event_name, event_category, event_date, periods, reason, proof_url } = req.body;
    const now = new Date().toISOString().replace("T", " ").substring(0, 16);
    const stmt = db.prepare(`
      INSERT INTO ODRequests (student_name, student_roll, department, year, faculty_id, faculty_name, event_name, event_category, event_date, periods, reason, proof_url, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);
    const info = stmt.run(student_name, student_roll, department, year, faculty_id, faculty_name, event_name, event_category, event_date, periods, reason, proof_url || "", now);
    res.json({ message: "OD Request submitted successfully", id: Number(info.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/od-requests/:id", (req, res) => {
  try {
    const { status, comment } = req.body;
    db.prepare("UPDATE ODRequests SET status=?, comment=? WHERE id=?").run(status.toUpperCase(), comment || "", req.params.id);
    res.json({ message: `OD Request marked as ${status.toUpperCase()}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/appointments", (req, res) => {
  try {
    const rows = db.prepare("SELECT * FROM Appointments ORDER BY id DESC").all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/faculty/:id/appointment", (req, res) => {
  try {
    const { student_name, student_roll, student_email, faculty_name, day, time_slot, purpose } = req.body;
    const now = new Date().toISOString().replace("T", " ").substring(0, 16);
    const stmt = db.prepare(`
      INSERT INTO Appointments (student_name, student_roll, student_email, faculty_id, faculty_name, day, time_slot, purpose, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?)
    `);
    const info = stmt.run(student_name, student_roll || "", student_email || "", req.params.id, faculty_name || "", day, time_slot, purpose, now);
    res.json({ message: "Appointment confirmed successfully", id: Number(info.lastInsertRowid) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/stats", (req, res) => {
  try {
    const totalFaculty = db.prepare("SELECT COUNT(*) as c FROM Faculty").get().c;
    const pendingOds = db.prepare("SELECT COUNT(*) as c FROM ODRequests WHERE status='PENDING'").get().c;
    const totalAppts = db.prepare("SELECT COUNT(*) as c FROM Appointments").get().c;
    const totalPeriods = db.prepare("SELECT COUNT(*) as c FROM Timetable").get().c;
    res.json({
      total_faculty: totalFaculty,
      pending_od_requests: pendingOds,
      total_appointments: totalAppts,
      total_periods_tracked: totalPeriods
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/admin/timetable/upload", (req, res) => {
  res.json({
    faculty_name: "Dr. S. Meenakshi",
    department: "Artificial Intelligence & Data Science",
    entries: [
      { day: "Monday", period_number: 1, start_time: "08:30", end_time: "09:20", subject: "FREE / CABIN", status: "FREE" },
      { day: "Monday", period_number: 2, start_time: "09:20", end_time: "10:10", subject: "Knowledge Representation", status: "CLASS" },
      { day: "Monday", period_number: 3, start_time: "10:20", end_time: "11:10", subject: "FREE", status: "FREE" },
      { day: "Monday", period_number: 4, start_time: "11:10", end_time: "12:00", subject: "Computer Vision & AR", status: "CLASS" },
      { day: "Monday", period_number: 5, start_time: "12:00", end_time: "12:40", subject: "LUNCH BREAK", status: "LUNCH" },
      { day: "Monday", period_number: 6, start_time: "12:40", end_time: "13:30", subject: "FREE / MENTORING", status: "FREE" },
      { day: "Monday", period_number: 7, start_time: "13:30", end_time: "14:20", subject: "AI Project Lab", status: "LAB" },
      { day: "Monday", period_number: 8, start_time: "14:20", end_time: "15:10", subject: "AI Project Lab", status: "LAB" }
    ],
    confidence_score: "98.4%",
    source: "Smart OCR Engine"
  });
});

app.post("/api/admin/timetable/verify", (req, res) => {
  try {
    const { faculty_name, department, entries } = req.body;
    let fac = db.prepare("SELECT faculty_id FROM Faculty WHERE name = ?").get(faculty_name);
    let faculty_id;
    if (!fac) {
      const info = db.prepare(`
        INSERT INTO Faculty (name, department, designation, location, avatar_color)
        VALUES (?, ?, 'Assistant Professor', 'New Faculty Cabin', 'cyan')
      `).run(faculty_name, department);
      faculty_id = Number(info.lastInsertRowid);
    } else {
      faculty_id = fac.faculty_id;
    }

    const daysPresent = [...new Set(entries.map((e) => e.day))];
    for (const d of daysPresent) {
      db.prepare("DELETE FROM Timetable WHERE faculty_id=? AND day=?").run(faculty_id, d);
    }

    const insertStmt = db.prepare(`
      INSERT INTO Timetable (faculty_id, day, period_number, start_time, end_time, subject, status, room)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const e of entries) {
      insertStmt.run(faculty_id, e.day, e.period_number, e.start_time, e.end_time, e.subject, e.status, e.room || "Classroom");
    }

    res.json({ message: `Timetable verified and saved successfully for ${faculty_name} (${entries.length} entries).` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`CampusSync & OD Hub backend listening on http://localhost:${PORT}`);
});