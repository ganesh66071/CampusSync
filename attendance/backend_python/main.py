from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import settings
from database import db
from face_engine import face_engine
from bluetooth_manager import bt_manager
from session_manager import session_manager

app = FastAPI(
    title="ESP32 Smart Classroom Attendance System",
    description="Python Backend for ESP32 Bluetooth SPP & Computer Vision Face Verification",
    version="2.0.0"
)

# CORS setup for frontend Vite dev server & production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Models
class StudentLookupRequest(BaseModel):
    registrationNumber: str

class EnrollStudentRequest(BaseModel):
    registration_number: str
    name: str
    department: str
    year: str
    section: str = "Sec-A"
    image_base64: Optional[str] = None

class FaceVerifyRequest(BaseModel):
    registrationNumber: str
    image_base64: str

class StartAttendanceRequest(BaseModel):
    registrationNumber: str
    faceVerified: bool

# ----------------- API ENDPOINTS ----------------- #

@app.get("/api/health")
def get_health():
    return {
        "status": "UP",
        "service": "ESP32 Attendance System Python Backend",
        "bluetooth_port": settings.bluetooth_port,
        "usb_debug_port": settings.usb_debug_port,
        "heartbeat_interval_sec": settings.heartbeat_interval,
        "test_mode": settings.test_mode
    }

@app.get("/api/bluetooth/status")
def get_bluetooth_status():
    """Truthful hardware status endpoint without fake states."""
    return bt_manager.get_status()

@app.post("/api/bluetooth/test-ping")
def test_bluetooth_ping():
    """Manual test endpoint to verify PING -> PONG over COM14 without starting a full session."""
    if not bt_manager.is_connected:
        connected, msg = bt_manager.connect()
        if not connected:
            raise HTTPException(status_code=503, detail=msg)
    
    ok, resp = bt_manager.ping()
    if not ok:
        raise HTTPException(status_code=504, detail=f"Ping failed: {resp}")
    
    return {"success": True, "message": "PONG received from ESP32", "response": resp}

@app.post("/api/bluetooth/reconnect")
@app.post("/api/esp32/reconnect")
def reconnect_bluetooth():
    """Explicit endpoint to retry connection to ESP32 on COM14."""
    ok, msg = bt_manager.connect()
    if not ok:
        raise HTTPException(status_code=503, detail=msg)
    return {"success": True, "message": msg, "state": bt_manager.state}

@app.get("/api/esp32/status")
def get_esp32_status():
    """Alias for Bluetooth hardware status."""
    return bt_manager.get_status()

# 1. Student Lookup (Compatible with existing frontend)
@app.post("/api/verify-student")
def verify_student(payload: StudentLookupRequest):
    student = db.get_student(payload.registrationNumber)
    if not student:
        raise HTTPException(
            status_code=404, 
            detail=f"Registration Number {payload.registrationNumber.strip().upper()} not enrolled in system."
        )
    return {
        "success": True,
        "message": "Student verified in database.",
        "student": {
            "registrationNumber": student["registration_number"],
            "name": student["name"],
            "department": student.get("department", "AIML"),
            "year": student.get("year", "2nd Year"),
            "section": student.get("section", "Sec-A"),
            "has_face_template": bool(student.get("face_template"))
        }
    }

# 2. Student Enrollment
@app.post("/api/students/enroll")
def enroll_student(payload: EnrollStudentRequest):
    face_template = None
    if payload.image_base64:
        img = face_engine.decode_image(payload.image_base64)
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image encoding.")
        has_face, _ = face_engine.detect_face(img)
        if not has_face:
            raise HTTPException(status_code=400, detail="No face detected in enrollment image. Please face camera clearly.")
        face_template = face_engine.extract_face_signature(img)

    enrolled = db.enroll_student({
        "registration_number": payload.registration_number,
        "name": payload.name,
        "department": payload.department,
        "year": payload.year,
        "section": payload.section,
        "face_template": face_template
    })

    return {
        "success": True,
        "message": f"Student {enrolled['name']} successfully enrolled.",
        "student": {k: v for k, v in enrolled.items() if k != "face_template"}
    }

# 3. Live Face Verification Endpoint
@app.post("/api/face/verify")
def verify_face(payload: FaceVerifyRequest):
    student = db.get_student(payload.registrationNumber)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    img = face_engine.decode_image(payload.image_base64)
    if img is None:
        raise HTTPException(status_code=400, detail="Corrupted image payload.")

    verified, confidence, message = face_engine.compare_faces(img, student.get("face_template"))
    if not verified:
        return {
            "success": False,
            "verified": False,
            "confidence": confidence,
            "message": message
        }

    return {
        "success": True,
        "verified": True,
        "confidence": confidence,
        "message": message,
        "student": {
            "registrationNumber": student["registration_number"],
            "name": student["name"]
        }
    }

# 4. Start Attendance Monitoring (Stage B)
@app.post("/api/attendance/start")
def start_attendance(payload: StartAttendanceRequest):
    if not payload.faceVerified:
        raise HTTPException(
            status_code=400, 
            detail="Face verification must be passed before attendance session can start."
        )

    student = db.get_student(payload.registrationNumber)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found in institutional records.")

    ok, msg, session = session_manager.start_session(student)
    if not ok:
        raise HTTPException(status_code=503, detail=msg)

    return {
        "success": True,
        "message": msg,
        "session": session
    }

# 5. Get Current Attendance Session (Stage C & D Dashboard)
@app.get("/api/attendance/session/current")
def get_current_session():
    session = session_manager.get_current_session()
    if not session:
        return {"active": False, "session": None}
    return {"active": True, "session": session}

# 6. Stop Attendance Session
@app.post("/api/attendance/stop")
def stop_attendance():
    ok, msg = session_manager.stop_session("Manual end by student/lecturer")
    return {"success": ok, "message": msg}

# 7. Backward-compatible /api/mark-attendance for frontend button
@app.post("/api/mark-attendance")
def legacy_mark_attendance(payload: dict = Body(...)):
    reg_no = payload.get("registrationNumber")
    face_verified = payload.get("faceVerified", False)
    
    if not reg_no:
        raise HTTPException(status_code=400, detail="Registration number is required.")
    if not face_verified:
        raise HTTPException(status_code=400, detail="Face verification check has not passed.")

    student = db.get_student(reg_no)
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    # Start the continuous 5-minute monitored session
    ok, msg, session = session_manager.start_session(student)
    if not ok:
        raise HTTPException(status_code=503, detail=msg)

    return {
        "success": True,
        "message": "Attendance session started with 5-minute ESP32 Bluetooth monitoring.",
        "timestamp": session["start_time"],
        "session": session
    }

# 8. History / Administrative Logs (Compatible with frontend)
@app.get("/api/attendance-logs")
@app.get("/api/attendance/history")
def get_attendance_logs():
    history = db.get_attendance_history()
    return {
        "success": True,
        "count": len(history),
        "logs": [
            {
                "id": h.get("session_id", "1"),
                "student_name": h.get("student_name", "Unknown"),
                "registration_number": h.get("student_id") or h.get("registration_number", "N/A"),
                "department": h.get("department", "AIML"),
                "status": h.get("status", "PRESENT"),
                "attendance_mode": h.get("attendance_mode", "BLUETOOTH"),
                "period_label": h.get("period_label", "Period 1"),
                "od_request_id": h.get("od_request_id"),
                "beacon_id": h.get("beacon_id") or (
                    "OD Exemption Service" if h.get("attendance_mode") == "OD_EXEMPTION" else f"ESP32_Attendance ({settings.bluetooth_port})"
                ),
                "timestamp": h.get("start_time") or h.get("end_time"),
                "warnings_count": len(h.get("warnings", []))
            }
            for h in history
        ]
    }

# 9. OD Status Check for Attendance
@app.get("/api/attendance/od-status/{reg_no}")
def get_student_od_status_api(reg_no: str, date: Optional[str] = None, period: Optional[int] = None):
    try:
        import sys
        from pathlib import Path
        backend_path = str(Path(__file__).resolve().parent.parent.parent / "backend")
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        import integrated_service
        return integrated_service.check_student_od_status(reg_no, date, period)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OD status check failed: {str(e)}")

# 10. Manual OD Sync Trigger
@app.post("/api/attendance/sync-od/{od_id}")
def sync_od_api(od_id: int):
    try:
        import sys
        from pathlib import Path
        backend_path = str(Path(__file__).resolve().parent.parent.parent / "backend")
        if backend_path not in sys.path:
            sys.path.insert(0, backend_path)
        import integrated_service
        res = integrated_service.sync_approved_od_to_attendance(od_id)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"OD synchronization failed: {str(e)}")

@app.on_event("shutdown")
def on_shutdown():
    print("[Server Shutdown] Safely stopping session and closing Bluetooth COM port...")
    session_manager.stop_session("Server shutdown")
    bt_manager.disconnect()
