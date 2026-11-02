import sqlite3
import datetime
import os
import json
import re
from typing import Optional, List, Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "backend", "faculty.db")
DATA_STORE_PATH = os.path.join(BASE_DIR, "attendance", "backend_python", "data_store.json")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_integrated_db():
    """Initializes and migrates shared database schema."""
    conn = get_db()
    cursor = conn.cursor()

    # 1. Ensure Students table exists and is shared
    cursor.execute("""
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

    # 2. Ensure AttendanceRecords table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS AttendanceRecords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT UNIQUE,
        registration_number TEXT NOT NULL,
        student_name TEXT,
        department TEXT,
        date TEXT NOT NULL,
        period_number INTEGER,
        period_label TEXT,
        status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'OD - PRESENT'
        attendance_mode TEXT NOT NULL, -- 'BLUETOOTH', 'OD_EXEMPTION', 'MANUAL'
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

    # 3. Ensure AttendanceSessions (live active session) table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS AttendanceSessions (
        session_id TEXT PRIMARY KEY,
        registration_number TEXT NOT NULL,
        student_name TEXT,
        department TEXT,
        start_time TEXT NOT NULL,
        start_epoch REAL NOT NULL,
        end_time TEXT,
        status TEXT NOT NULL, -- 'MONITORING', 'WARNING', 'PRESENT', 'ABSENT', 'OD - PRESENT'
        consecutive_failures INTEGER DEFAULT 0,
        warnings TEXT, -- JSON serialized list
        check_history TEXT, -- JSON serialized list
        last_successful_heartbeat TEXT,
        last_check_timestamp REAL,
        od_exempted INTEGER DEFAULT 0,
        od_request_id INTEGER
    )
    """)

    # 4. Ensure ODAttendanceAuditLog table exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS ODAttendanceAuditLog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        od_request_id INTEGER,
        action TEXT NOT NULL, -- 'SYNCHRONIZE', 'REVOKE', 'MANUAL_OVERRIDE'
        registration_number TEXT NOT NULL,
        date TEXT NOT NULL,
        periods TEXT,
        previous_status TEXT,
        new_status TEXT,
        reason TEXT,
        timestamp TEXT NOT NULL
    )
    """)

    # Check and migrate columns in ODRequests if missing
    cursor.execute("PRAGMA table_info(ODRequests)")
    od_cols = [c[1] for c in cursor.fetchall()]
    for col, col_type in [
        ("registration_number", "TEXT"),
        ("synced_to_attendance", "INTEGER DEFAULT 0"),
        ("sync_timestamp", "TEXT")
    ]:
        if col not in od_cols:
            cursor.execute(f"ALTER TABLE ODRequests ADD COLUMN {col} {col_type}")

    # Ensure registration_number is backfilled from student_roll in ODRequests
    cursor.execute("UPDATE ODRequests SET registration_number = student_roll WHERE registration_number IS NULL OR registration_number = ''")

    # Migrate initial students from data_store.json into SQLite if empty
    cursor.execute("SELECT COUNT(*) FROM Students")
    count_students = cursor.fetchone()[0]
    if count_students == 0:
        students_to_insert = [
            ("RA2511026020082", "B.Ganesh", "AIML", "2nd Year", "Sec-B", 1, "WzAuMCwgMC4wNDY0LCAwLjIxNDgsIDAuMzUxNCwgMC40MTQ5LCAwLjQ5MzEsIDAuNDc2OCwgMC42MjI5LCAwLjYxMDgsIDAuNjk5MywgMC43NDc0LCAwLjczODgsIDEuMCwgMC42ODM4LCAwLjM4NjYsIDAuMjQ5MSwgMC4xNjc1LCAwLjE4NDcsIDAuMTM3NSwgMC4xMzQ5LCAwLjA4MDgsIDAuMDQ5LCAwLjAyNjYsIDAuMDE4LCAwLjAxMiwgMC4wMDk1LCAwLjAxMzcsIDAuMDEyLCAwLjAwMTcsIDAuMCwgMC4wMDI2LCAwLjAwNDNd"),
            ("RA2511026020083", "Priya Sharma", "Computer Science", "3rd Year", "Sec-A", 1, None),
            ("RA2511026020084", "Rahul Verma", "Data Science", "2nd Year", "Sec-C", 1, None),
            ("22AIML042", "Aakash Sharma", "AIML", "3rd Year", "Sec-A", 1, None),
            ("22CSE108", "Deepika V.", "CSE", "3rd Year", "Sec-B", 1, None),
            ("22AIML019", "Rohan M.", "AIML", "3rd Year", "Sec-A", 1, None)
        ]
        now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for s in students_to_insert:
            cursor.execute("""
            INSERT OR IGNORE INTO Students (registration_number, name, department, year, section, enrolled, face_template, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (s[0], s[1], s[2], s[3], s[4], s[5], s[6], now_ts))

    # Also migrate existing attendance records from data_store.json if empty
    cursor.execute("SELECT COUNT(*) FROM AttendanceRecords")
    count_records = cursor.fetchone()[0]
    if count_records == 0 and os.path.exists(DATA_STORE_PATH):
        try:
            with open(DATA_STORE_PATH, "r", encoding="utf-8") as f:
                ds = json.load(f)
                for rec in ds.get("attendance_records", []):
                    s_id = rec.get("session_id")
                    r_no = rec.get("student_id")
                    s_name = rec.get("student_name")
                    dept = rec.get("department", "AIML")
                    raw_time = rec.get("start_time") or rec.get("end_time") or datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    dt_part = raw_time.split(" ")[0] if " " in raw_time else raw_time
                    stat = rec.get("status", "PRESENT")
                    cursor.execute("""
                    INSERT OR IGNORE INTO AttendanceRecords 
                    (session_id, registration_number, student_name, department, date, period_number, period_label, status, attendance_mode, beacon_id, start_time, end_time, completion_reason, warnings_count)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        s_id, r_no, s_name, dept, dt_part, 1, "Period 1", stat, "BLUETOOTH",
                        "ESP32_Attendance (COM14)", rec.get("start_time"), rec.get("end_time"),
                        rec.get("completion_reason"), len(rec.get("warnings", []))
                    ))
        except Exception as e:
            print(f"[IntegratedDB] Warning reading data_store.json migration: {e}")

    conn.commit()
    conn.close()

def parse_periods(periods_str: Optional[str]) -> List[int]:
    """
    Parses period strings such as 'Period 1 - Period 4', 'Period 1, 2, 3', or 'Full Day'.
    Returns list of integer period numbers (1..9).
    """
    if not periods_str:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9]
    
    text = periods_str.strip().lower()
    if "full day" in text or "all" in text:
        return [1, 2, 3, 4, 5, 6, 7, 8, 9]
    
    # Try range pattern e.g. 'period 1 - period 4' or '1 - 4'
    range_match = re.search(r'period\s*(\d+)\s*[-–to]+\s*period\s*(\d+)', text)
    if not range_match:
        range_match = re.search(r'(\d+)\s*[-–to]+\s*(\d+)', text)
    
    if range_match:
        start_p = int(range_match.group(1))
        end_p = int(range_match.group(2))
        return list(range(min(start_p, end_p), max(start_p, end_p) + 1))
    
    # Extract any explicit integers mentioned with period
    found = [int(p) for p in re.findall(r'period\s*(\d+)', text)]
    if found:
        return sorted(list(set(found)))
    
    # Just standalone integers
    found_digits = [int(d) for d in re.findall(r'\b([1-9])\b', text)]
    if found_digits:
        return sorted(list(set(found_digits)))

    return [1, 2, 3, 4] # default fallback for half day

def get_current_period_info(target_time: Optional[datetime.datetime] = None) -> Dict[str, Any]:
    """
    Determines current period number and slot based on time.
    Period 1: 08:30 - 09:20
    Period 2: 09:20 - 10:10
    Period 3: 10:20 - 11:10
    Period 4: 11:10 - 12:00
    Period 5: 12:00 - 12:40 (Lunch)
    Period 6: 12:40 - 13:30
    Period 7: 13:30 - 14:20
    Period 8: 14:20 - 15:10
    Period 9: 15:10 - 15:50
    """
    now = target_time or datetime.datetime.now()
    cur_mins = now.hour * 60 + now.minute
    periods_def = [
        (1, 8 * 60 + 30, 9 * 60 + 20, "08:30 - 09:20"),
        (2, 9 * 60 + 20, 10 * 60 + 10, "09:20 - 10:10"),
        (3, 10 * 60 + 20, 11 * 60 + 10, "10:20 - 11:10"),
        (4, 11 * 60 + 10, 12 * 60 + 0, "11:10 - 12:00"),
        (5, 12 * 60 + 0, 12 * 60 + 40, "12:00 - 12:40"),
        (6, 12 * 60 + 40, 13 * 60 + 30, "12:40 - 13:30"),
        (7, 13 * 60 + 30, 14 * 60 + 20, "13:30 - 14:20"),
        (8, 14 * 60 + 20, 15 * 60 + 10, "14:20 - 15:10"),
        (9, 15 * 60 + 10, 15 * 60 + 50, "15:10 - 15:50")
    ]
    for p_num, s_min, e_min, slot in periods_def:
        if s_min <= cur_mins <= e_min:
            return {"period_number": p_num, "period_label": f"Period {p_num}", "time_slot": slot, "in_session": True}
    
    # If outside normal hours, return closest or default Period 1
    if cur_mins < 8 * 60 + 30:
        return {"period_number": 1, "period_label": "Period 1", "time_slot": "08:30 - 09:20", "in_session": False}
    return {"period_number": 9, "period_label": "Period 9", "time_slot": "15:10 - 15:50", "in_session": False}

def check_student_od_status(student_id: str, date_str: Optional[str] = None, period_number: Optional[int] = None) -> Dict[str, Any]:
    """
    Checks if a student has an APPROVED OD request for the given date and period.
    Matches student by either registration_number or student_roll.
    """
    clean_id = student_id.strip().upper()
    now = datetime.datetime.now()
    target_date = date_str or now.strftime("%Y-%m-%d")
    
    if period_number is None:
        period_info = get_current_period_info(now)
        target_period = period_info["period_number"]
    else:
        target_period = period_number

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT * FROM ODRequests 
        WHERE (UPPER(student_roll) = ? OR UPPER(registration_number) = ?)
          AND UPPER(status) = 'APPROVED'
          AND event_date = ?
    """, (clean_id, clean_id, target_date))
    rows = cursor.fetchall()
    conn.close()

    for r in rows:
        row_dict = dict(r)
        periods_covered = parse_periods(row_dict.get("periods"))
        if target_period in periods_covered:
            return {
                "has_approved_od": True,
                "od_request_id": row_dict["id"],
                "event_name": row_dict["event_name"],
                "reason": row_dict.get("reason"),
                "periods": row_dict.get("periods"),
                "periods_covered": periods_covered,
                "target_period": target_period,
                "target_date": target_date,
                "faculty_name": row_dict.get("faculty_name"),
                "student_name": row_dict.get("student_name")
            }

    return {
        "has_approved_od": False,
        "target_period": target_period,
        "target_date": target_date
    }

def sync_approved_od_to_attendance(od_request_id: int) -> Dict[str, Any]:
    """
    Synchronizes an approved OD request into Attendance records.
    Idempotent: will not create duplicate attendance records for the same OD request and periods.
    Updates any existing ABSENT records for the same student, date, and period to OD - PRESENT.
    """
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM ODRequests WHERE id = ?", (od_request_id,))
    od_row = cursor.fetchone()
    if not od_row:
        conn.close()
        return {"success": False, "message": f"OD Request {od_request_id} not found"}

    od = dict(od_row)
    if od.get("status", "").upper() != "APPROVED":
        conn.close()
        return {"success": False, "message": f"OD Request is not APPROVED (status: {od.get('status')})"}

    student_id = od.get("registration_number") or od.get("student_roll")
    student_name = od.get("student_name")
    dept = od.get("department", "AIML")
    event_date = od.get("event_date")
    periods = parse_periods(od.get("periods"))
    now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    created_records = []
    updated_records = []

    for p in periods:
        session_id = f"OD-{od_request_id}-P{p}-{event_date.replace('-', '')}"
        
        # Check if record already exists for this student, date, and period
        cursor.execute("""
            SELECT id, status, session_id FROM AttendanceRecords 
            WHERE (UPPER(registration_number) = UPPER(?) OR UPPER(student_name) = UPPER(?))
              AND date = ? AND period_number = ?
        """, (student_id, student_name, event_date, p))
        existing = cursor.fetchone()

        if existing:
            rec_id, old_status, exist_sid = existing[0], existing[1], existing[2]
            if old_status != "OD - PRESENT":
                cursor.execute("""
                    UPDATE AttendanceRecords 
                    SET status = 'OD - PRESENT', attendance_mode = 'OD_EXEMPTION', 
                        od_request_id = ?, completion_reason = ?
                    WHERE id = ?
                """, (od_request_id, f"Approved OD: {od.get('event_name')}", rec_id))
                updated_records.append(rec_id)

                # Log audit
                cursor.execute("""
                    INSERT INTO ODAttendanceAuditLog 
                    (od_request_id, action, registration_number, date, periods, previous_status, new_status, reason, timestamp)
                    VALUES (?, 'SYNCHRONIZE', ?, ?, ?, ?, 'OD - PRESENT', ?, ?)
                """, (od_request_id, student_id, event_date, f"Period {p}", old_status, f"Approved OD updated record #{rec_id}", now_ts))
        else:
            # Create new OD - PRESENT record
            cursor.execute("""
                INSERT INTO AttendanceRecords 
                (session_id, registration_number, student_name, department, date, period_number, period_label, status, attendance_mode, od_request_id, beacon_id, start_time, end_time, completion_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'OD - PRESENT', 'OD_EXEMPTION', ?, 'OD_AUTOMATION', ?, ?, ?)
            """, (
                session_id, student_id, student_name, dept, event_date, p, f"Period {p}",
                od_request_id, f"{event_date} 08:30:00", f"{event_date} 16:00:00",
                f"Approved OD: {od.get('event_name')} ({od.get('reason')})"
            ))
            new_id = cursor.lastrowid
            created_records.append(new_id)

            cursor.execute("""
                INSERT INTO ODAttendanceAuditLog 
                (od_request_id, action, registration_number, date, periods, previous_status, new_status, reason, timestamp)
                VALUES (?, 'SYNCHRONIZE', ?, ?, ?, 'NONE', 'OD - PRESENT', ?, ?)
            """, (od_request_id, student_id, event_date, f"Period {p}", f"Created OD record for {od.get('event_name')}", now_ts))

    # Mark ODRequest as synced
    cursor.execute("""
        UPDATE ODRequests 
        SET synced_to_attendance = 1, sync_timestamp = ? 
        WHERE id = ?
    """, (now_ts, od_request_id))

    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Synchronized OD #{od_request_id} for {student_name} ({len(periods)} periods)",
        "created_records_count": len(created_records),
        "updated_records_count": len(updated_records),
        "periods_covered": periods
    }

def revoke_od_from_attendance(od_request_id: int, reason: str = "OD revoked or rejected") -> Dict[str, Any]:
    """
    Reverts attendance records tied to an OD request if it is revoked or rejected.
    Maintains an audit trail.
    """
    conn = get_db()
    cursor = conn.cursor()
    now_ts = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    cursor.execute("SELECT * FROM AttendanceRecords WHERE od_request_id = ?", (od_request_id,))
    records = cursor.fetchall()
    
    reverted_count = 0
    for r in records:
        r_dict = dict(r)
        # Mark as ABSENT or revert
        cursor.execute("""
            UPDATE AttendanceRecords 
            SET status = 'ABSENT', attendance_mode = 'MANUAL',
                completion_reason = ?
            WHERE id = ?
        """, (f"Reverted: {reason}", r_dict["id"]))
        
        cursor.execute("""
            INSERT INTO ODAttendanceAuditLog 
            (od_request_id, action, registration_number, date, periods, previous_status, new_status, reason, timestamp)
            VALUES (?, 'REVOKE', ?, ?, ?, 'OD - PRESENT', 'ABSENT', ?, ?)
        """, (od_request_id, r_dict["registration_number"], r_dict["date"], r_dict["period_label"], reason, now_ts))
        reverted_count += 1

    cursor.execute("UPDATE ODRequests SET synced_to_attendance = 0 WHERE id = ?", (od_request_id,))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Reverted {reverted_count} attendance records for OD #{od_request_id}",
        "reverted_count": reverted_count
    }

