import json
import sqlite3
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

# Path to the centralized SQLite database in backend/faculty.db
BASE_DIR = Path(__file__).resolve().parent.parent.parent
DB_PATH = BASE_DIR / "backend" / "faculty.db"
LEGACY_JSON_PATH = Path(__file__).parent / "data_store.json"

class DataStore:
    """
    Centralized Hybrid DataStore:
    Directly interfaces with the shared SQLite database (faculty.db) while
    maintaining backward compatibility with the legacy JSON store for fallback/caching.
    """
    def __init__(self):
        self.db_path = DB_PATH
        self.legacy_json_path = LEGACY_JSON_PATH
        self._ensure_sqlite()

    def _get_conn(self):
        conn = sqlite3.connect(str(self.db_path))
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_sqlite(self):
        """Ensures shared tables exist in SQLite."""
        if not self.db_path.exists():
            return
        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("""
            CREATE TABLE IF NOT EXISTS Students (
                registration_number TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                department TEXT NOT NULL,
                year TEXT,
                section TEXT DEFAULT 'Sec-A',
                enrolled INTEGER DEFAULT 1,
                face_template TEXT,
                created_at TEXT
            )
            """)
            c.execute("""
            CREATE TABLE IF NOT EXISTS AttendanceRecords (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT UNIQUE,
                registration_number TEXT NOT NULL,
                student_name TEXT,
                department TEXT,
                date TEXT NOT NULL,
                period_number INTEGER,
                period_label TEXT,
                status TEXT NOT NULL,
                attendance_mode TEXT NOT NULL,
                od_request_id INTEGER,
                beacon_id TEXT,
                start_time TEXT,
                end_time TEXT,
                completion_reason TEXT,
                warnings_count INTEGER DEFAULT 0,
                FOREIGN KEY(registration_number) REFERENCES Students(registration_number),
                FOREIGN KEY(od_request_id) REFERENCES ODRequests(id)
            )
            """)
            c.execute("""
            CREATE TABLE IF NOT EXISTS AttendanceSessions (
                session_id TEXT PRIMARY KEY,
                registration_number TEXT NOT NULL,
                student_name TEXT,
                department TEXT,
                start_time TEXT NOT NULL,
                start_epoch REAL NOT NULL,
                end_time TEXT,
                status TEXT NOT NULL,
                consecutive_failures INTEGER DEFAULT 0,
                warnings TEXT,
                check_history TEXT,
                last_successful_heartbeat TEXT,
                last_check_timestamp REAL,
                od_exempted INTEGER DEFAULT 0,
                od_request_id INTEGER
            )
            """)
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DataStore] Warning during SQLite initialization: {e}")

    def get_student(self, reg_no: str) -> Optional[Dict[str, Any]]:
        clean = reg_no.strip().upper()
        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("SELECT * FROM Students WHERE UPPER(registration_number) = ?", (clean,))
            row = c.fetchone()
            conn.close()
            if row:
                return dict(row)
        except Exception as e:
            print(f"[DataStore] SQLite get_student error: {e}")

        # Fallback to JSON
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for s in data.get("students", []):
                        if s["registration_number"].upper() == clean:
                            return s
        except Exception:
            pass
        return None

    def enroll_student(self, student_data: Dict[str, Any]) -> Dict[str, Any]:
        clean = student_data["registration_number"].strip().upper()
        now_ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("""
            INSERT INTO Students (registration_number, name, department, year, section, enrolled, face_template, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?)
            ON CONFLICT(registration_number) DO UPDATE SET
                name=excluded.name,
                department=excluded.department,
                year=excluded.year,
                section=excluded.section,
                face_template=COALESCE(excluded.face_template, Students.face_template)
            """, (
                clean,
                student_data["name"],
                student_data.get("department", "AIML"),
                student_data.get("year", "2nd Year"),
                student_data.get("section", "Sec-A"),
                student_data.get("face_template"),
                now_ts
            ))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DataStore] SQLite enroll_student error: {e}")

        # Also mirror to JSON for redundancy
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                updated = False
                for i, s in enumerate(data.get("students", [])):
                    if s["registration_number"].upper() == clean:
                        data["students"][i].update(student_data)
                        updated = True
                        break
                if not updated:
                    data["students"].append({**student_data, "registration_number": clean, "enrolled": True})
                with open(self.legacy_json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
        except Exception:
            pass

        return {**student_data, "registration_number": clean, "enrolled": True}

    def list_students(self) -> List[Dict[str, Any]]:
        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("SELECT registration_number, name, department, year, section, enrolled FROM Students")
            rows = [dict(r) for r in c.fetchall()]
            conn.close()
            if rows:
                return rows
        except Exception as e:
            print(f"[DataStore] SQLite list_students error: {e}")

        # Fallback to JSON
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return [{k: v for k, v in s.items() if k != "face_template"} for s in data.get("students", [])]
        except Exception:
            pass
        return []

    def save_session(self, session: Dict[str, Any]):
        sid = session.get("session_id")
        reg_no = session.get("student_id")
        sname = session.get("student_name")
        dept = session.get("department", "AIML")
        stime = session.get("start_time")
        sepoch = session.get("start_epoch", 0.0)
        etime = session.get("end_time")
        status = session.get("status", "MONITORING")
        consec = session.get("consecutive_failures", 0)
        warnings_str = json.dumps(session.get("warnings", []))
        history_str = json.dumps(session.get("check_history", []))
        last_hb = session.get("last_successful_heartbeat")
        last_chk = session.get("last_check_timestamp")
        od_exempt = 1 if session.get("od_exempted") else 0
        od_id = session.get("od_request_id")

        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("""
            INSERT INTO AttendanceSessions 
            (session_id, registration_number, student_name, department, start_time, start_epoch, end_time, status, consecutive_failures, warnings, check_history, last_successful_heartbeat, last_check_timestamp, od_exempted, od_request_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                end_time=excluded.end_time,
                status=excluded.status,
                consecutive_failures=excluded.consecutive_failures,
                warnings=excluded.warnings,
                check_history=excluded.check_history,
                last_successful_heartbeat=excluded.last_successful_heartbeat,
                last_check_timestamp=excluded.last_check_timestamp,
                od_exempted=excluded.od_exempted,
                od_request_id=excluded.od_request_id
            """, (sid, reg_no, sname, dept, stime, sepoch, etime, status, consec, warnings_str, history_str, last_hb, last_chk, od_exempt, od_id))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DataStore] SQLite save_session error: {e}")

        # JSON fallback mirror
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                matched = False
                for i, s in enumerate(data.get("sessions", [])):
                    if s["session_id"] == sid:
                        data["sessions"][i] = session
                        matched = True
                        break
                if not matched:
                    data.setdefault("sessions", []).append(session)
                with open(self.legacy_json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
        except Exception:
            pass

    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("SELECT * FROM AttendanceSessions WHERE session_id = ?", (session_id,))
            row = c.fetchone()
            conn.close()
            if row:
                res = dict(row)
                res["warnings"] = json.loads(res.get("warnings") or "[]")
                res["check_history"] = json.loads(res.get("check_history") or "[]")
                return res
        except Exception:
            pass

        # Fallback to JSON
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for s in data.get("sessions", []):
                        if s["session_id"] == session_id:
                            return s
        except Exception:
            pass
        return None

    def add_attendance_record(self, record: Dict[str, Any]):
        sid = record.get("session_id")
        reg_no = record.get("student_id") or record.get("registration_number", "UNKNOWN")
        sname = record.get("student_name", "Unknown")
        dept = record.get("department", "AIML")
        raw_time = record.get("start_time") or record.get("end_time") or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        date_str = raw_time.split(" ")[0] if " " in raw_time else raw_time
        status = record.get("status", "PRESENT")
        mode = record.get("attendance_mode", "BLUETOOTH")
        beacon = record.get("beacon_id", "ESP32_Attendance (COM14)")
        reason = record.get("completion_reason", "")
        warn_cnt = len(record.get("warnings", []))
        od_id = record.get("od_request_id")

        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("""
            INSERT INTO AttendanceRecords 
            (session_id, registration_number, student_name, department, date, period_number, period_label, status, attendance_mode, od_request_id, beacon_id, start_time, end_time, completion_reason, warnings_count)
            VALUES (?, ?, ?, ?, ?, 1, 'Period 1', ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                status=excluded.status,
                end_time=excluded.end_time,
                completion_reason=excluded.completion_reason,
                warnings_count=excluded.warnings_count
            """, (sid, reg_no, sname, dept, date_str, status, mode, od_id, beacon, record.get("start_time"), record.get("end_time"), reason, warn_cnt))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"[DataStore] SQLite add_attendance_record error: {e}")

        # JSON mirror
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                data.setdefault("attendance_records", []).insert(0, record)
                with open(self.legacy_json_path, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
        except Exception:
            pass

    def get_attendance_history(self) -> List[Dict[str, Any]]:
        try:
            conn = self._get_conn()
            c = conn.cursor()
            c.execute("SELECT * FROM AttendanceRecords ORDER BY id DESC")
            rows = c.fetchall()
            conn.close()
            if rows:
                results = []
                for r in rows:
                    rd = dict(r)
                    results.append({
                        "session_id": rd["session_id"],
                        "student_id": rd["registration_number"],
                        "registration_number": rd["registration_number"],
                        "student_name": rd["student_name"],
                        "department": rd["department"],
                        "date": rd["date"],
                        "period_number": rd.get("period_number", 1),
                        "period_label": rd.get("period_label", "Period 1"),
                        "status": rd["status"],
                        "attendance_mode": rd["attendance_mode"],
                        "od_request_id": rd.get("od_request_id"),
                        "beacon_id": rd.get("beacon_id", "ESP32_Attendance (COM14)"),
                        "start_time": rd.get("start_time"),
                        "end_time": rd.get("end_time"),
                        "completion_reason": rd.get("completion_reason"),
                        "warnings": [{"warning_number": i+1} for i in range(rd.get("warnings_count", 0))]
                    })
                return results
        except Exception as e:
            print(f"[DataStore] SQLite get_attendance_history error: {e}")

        # Fallback to JSON
        try:
            if self.legacy_json_path.exists():
                with open(self.legacy_json_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    return data.get("attendance_records", [])
        except Exception:
            pass
        return []

db = DataStore()
