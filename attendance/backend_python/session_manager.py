import time
import uuid
import threading
from typing import Optional, Dict, Any, List, Tuple
from config import settings
from database import db
from bluetooth_manager import bt_manager

# Import centralized integration service
try:
    import sys
    from pathlib import Path
    backend_path = str(Path(__file__).resolve().parent.parent.parent / "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    import integrated_service
except Exception as e:
    integrated_service = None
    print(f"[SessionManager] Warning: could not import integrated_service: {e}")

class SessionManager:
    """
    Manages active student attendance monitoring session with OD Exemption:
    - Verifies student identity and checks for approved OD request BEFORE starting and at each check.
    - If student has an approved OD for the current session/period:
        * Excluded from Bluetooth absence penalty.
        * Recorded as 'OD - PRESENT'.
        * Bluetooth disconnection does NOT mark them ABSENT.
    - If student has no approved OD:
        * Executes standard 5-minute Bluetooth ping checks.
        * 1st fail: Warning 1
        * 2nd fail: Warning 2
        * 3rd fail: Marks session ABSENT & terminates.
        * Successful heartbeat: resets failure count to 0.
    """
    def __init__(self):
        self._lock = threading.Lock()
        self._active_session: Optional[Dict[str, Any]] = None
        self._monitor_thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()

    def get_current_session(self) -> Optional[Dict[str, Any]]:
        with self._lock:
            if not self._active_session:
                return None
            
            # Compute seconds remaining for next check
            now = time.time()
            interval = settings.heartbeat_interval
            elapsed_since_check = now - self._active_session["last_check_timestamp"]
            next_check_in_seconds = max(0, int(interval - elapsed_since_check))

            return {
                **self._active_session,
                "interval_seconds": interval,
                "seconds_until_next_check": next_check_in_seconds,
                "test_mode": settings.test_mode
            }

    def start_session(self, student: Dict[str, Any]) -> Tuple[bool, str, Optional[Dict[str, Any]]]:
        with self._lock:
            # If session is already running for this student, return it
            if self._active_session and self._active_session["status"] in ("MONITORING", "WARNING", "OD - PRESENT"):
                if self._active_session["student_id"] == student["registration_number"]:
                    return True, "Active session already running for this student.", self._active_session
                else:
                    return False, f"Another student session ({self._active_session['student_id']}) is currently active. End it first.", None

            session_id = f"ATT-{int(time.time())}-{uuid.uuid4().hex[:6].upper()}"
            start_epoch = time.time()
            now_iso = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(start_epoch))
            today_str = time.strftime("%Y-%m-%d", time.localtime(start_epoch))

            # Step 1 & 2: Check whether student has an APPROVED OD request covering current date & session
            od_status = {"has_approved_od": False}
            if integrated_service:
                try:
                    od_status = integrated_service.check_student_od_status(student["registration_number"], today_str)
                except Exception as e:
                    print(f"[SessionManager] OD check error: {e}")

            if od_status.get("has_approved_od"):
                # OD Exemption: Student is authorized on official duty!
                print(f"[SessionManager] Student {student['name']} ({student['registration_number']}) is on APPROVED OD: {od_status.get('event_name')}")
                
                session_record = {
                    "session_id": session_id,
                    "student_id": student["registration_number"],
                    "student_name": student["name"],
                    "department": student.get("department", "AIML"),
                    "start_time": now_iso,
                    "start_epoch": start_epoch,
                    "end_time": None,
                    "status": "OD - PRESENT",
                    "attendance_mode": "OD_EXEMPTION",
                    "od_exempted": True,
                    "od_request_id": od_status.get("od_request_id"),
                    "od_details": {
                        "event_name": od_status.get("event_name"),
                        "reason": od_status.get("reason"),
                        "faculty_name": od_status.get("faculty_name"),
                        "periods": od_status.get("periods")
                    },
                    "consecutive_failures": 0,
                    "warnings": [],
                    "last_successful_heartbeat": now_iso,
                    "last_check_timestamp": start_epoch,
                    "check_history": [
                        {
                            "timestamp": now_iso,
                            "success": True,
                            "detail": f"OD Exemption Verified: {od_status.get('event_name')}. Student excused from Bluetooth absence tracking."
                        }
                    ]
                }

                self._active_session = session_record
                db.save_session(session_record)
                db.add_attendance_record({
                    **session_record,
                    "completion_reason": f"Approved OD: {od_status.get('event_name')}"
                })

                # Start background thread to maintain session lifecycle and periodically re-verify OD
                self._stop_event.clear()
                self._monitor_thread = threading.Thread(target=self._monitoring_loop, args=(session_id,), daemon=True)
                self._monitor_thread.start()

                return True, f"Verified: Approved OD ({od_status.get('event_name')}). Marked OD - PRESENT.", session_record

            # Step 3: No approved OD exists -> Execute original Bluetooth verification & connection
            connected, conn_msg = bt_manager.connect()
            if not connected:
                return False, f"Could not establish Bluetooth serial connection with ESP32: {conn_msg}", None

            ping_ok, ping_msg = bt_manager.ping()
            if not ping_ok:
                return False, f"ESP32 on {settings.bluetooth_port} is not replying to PING. Response: {ping_msg}", None

            bt_manager.start_session_hw(student["registration_number"], session_id)

            session_record = {
                "session_id": session_id,
                "student_id": student["registration_number"],
                "student_name": student["name"],
                "department": student.get("department", "AIML"),
                "start_time": now_iso,
                "start_epoch": start_epoch,
                "end_time": None,
                "status": "MONITORING", # NOT_STARTED, MONITORING, WARNING, PRESENT, ABSENT, OD - PRESENT
                "attendance_mode": "BLUETOOTH",
                "od_exempted": False,
                "od_request_id": None,
                "consecutive_failures": 0,
                "warnings": [],
                "last_successful_heartbeat": now_iso,
                "last_check_timestamp": start_epoch,
                "check_history": [
                    {
                        "timestamp": now_iso,
                        "success": True,
                        "detail": f"Session started & initial PONG verified on {settings.bluetooth_port}."
                    }
                ]
            }

            self._active_session = session_record
            db.save_session(session_record)

            self._stop_event.clear()
            self._monitor_thread = threading.Thread(target=self._monitoring_loop, args=(session_id,), daemon=True)
            self._monitor_thread.start()

            print(f"[SessionManager] Started Bluetooth attendance session {session_id} for student {student['name']}.")
            return True, "Attendance monitoring active and verified.", session_record

    def stop_session(self, reason: str = "Student manually ended attendance session.") -> Tuple[bool, str]:
        with self._lock:
            if not self._active_session:
                return False, "No active session to stop."

            self._stop_event.set()
            now_iso = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(time.time()))
            
            # If active status was MONITORING or WARNING, mark as PRESENT
            # If it was OD - PRESENT, retain OD - PRESENT
            if self._active_session["status"] in ("MONITORING", "WARNING"):
                self._active_session["status"] = "PRESENT"

            self._active_session["end_time"] = now_iso

            # Log to permanent records
            db.add_attendance_record({
                **self._active_session,
                "completion_reason": reason
            })
            db.save_session(self._active_session)

            try:
                bt_manager.stop_session_hw()
            except Exception:
                pass

            print(f"[SessionManager] Ended session {self._active_session['session_id']} with status {self._active_session['status']}.")
            
            stopped = dict(self._active_session)
            self._active_session = None
            return True, f"Session concluded with status: {stopped['status']}."

    def _monitoring_loop(self, session_id: str):
        """
        Background worker that wakes up every heartbeat_interval seconds.
        Pre-check: Verifies if OD was approved in real-time while session is running.
        If student is OD-exempt:
          - Prevents Bluetooth absence penalty.
          - Keeps status as 'OD - PRESENT'.
        If regular Bluetooth:
          - Pings ESP32.
          - 1 miss -> Warning 1
          - 2 misses -> Warning 2
          - 3 misses -> Marks ABSENT, ends session.
        """
        print(f"[Monitor Worker] Active for session {session_id}. Interval: {settings.heartbeat_interval}s.")

        while not self._stop_event.is_set():
            interval = settings.heartbeat_interval
            interrupted = self._stop_event.wait(timeout=interval)
            if interrupted:
                break

            with self._lock:
                if not self._active_session or self._active_session["session_id"] != session_id:
                    break

                now_epoch = time.time()
                now_iso = time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now_epoch))
                today_str = time.strftime("%Y-%m-%d", time.localtime(now_epoch))
                self._active_session["last_check_timestamp"] = now_epoch

                student_id = self._active_session["student_id"]

                # Real-time check: Was an OD approved while the session was active?
                od_status = {"has_approved_od": False}
                if integrated_service:
                    try:
                        od_status = integrated_service.check_student_od_status(student_id, today_str)
                    except Exception as e:
                        print(f"[Monitor Worker] OD check error: {e}")

                if od_status.get("has_approved_od"):
                    # Transition / retain OD Exemption
                    if not self._active_session.get("od_exempted"):
                        print(f"[Monitor Worker] Real-time OD Approval detected for {student_id}! Switching to OD - PRESENT.")
                        self._active_session["od_exempted"] = True
                        self._active_session["od_request_id"] = od_status.get("od_request_id")
                        self._active_session["status"] = "OD - PRESENT"
                        self._active_session["consecutive_failures"] = 0
                        self._active_session["warnings"] = []
                        self._active_session["check_history"].append({
                            "timestamp": now_iso,
                            "success": True,
                            "detail": f"OD Approved mid-session: {od_status.get('event_name')}. Cleared any warnings and marked OD - PRESENT."
                        })
                        db.save_session(self._active_session)
                        db.add_attendance_record({
                            **self._active_session,
                            "completion_reason": f"Real-time Approved OD: {od_status.get('event_name')}"
                        })

                    # If already OD exempted, simply record positive heartbeat
                    self._active_session["last_successful_heartbeat"] = now_iso
                    self._active_session["check_history"].append({
                        "timestamp": now_iso,
                        "success": True,
                        "detail": f"OD Exemption Verified active for {od_status.get('event_name')}. Attendance protected."
                    })
                    db.save_session(self._active_session)
                    continue

                # If student was previously marked OD exempted, but OD was revoked:
                if self._active_session.get("od_exempted") and not od_status.get("has_approved_od"):
                    print(f"[Monitor Worker] OD status revoked for {student_id}. Resuming Bluetooth verification.")
                    self._active_session["od_exempted"] = False
                    self._active_session["status"] = "MONITORING"
                    self._active_session["check_history"].append({
                        "timestamp": now_iso,
                        "success": False,
                        "detail": "OD Exemption no longer active. Resuming standard Bluetooth attendance verification."
                    })

                # Normal Bluetooth SPP Check
                ping_success, ping_resp = bt_manager.ping()

                if ping_success:
                    prev_fails = self._active_session["consecutive_failures"]
                    self._active_session["consecutive_failures"] = 0
                    self._active_session["last_successful_heartbeat"] = now_iso
                    self._active_session["status"] = "MONITORING"
                    self._active_session["check_history"].append({
                        "timestamp": now_iso,
                        "success": True,
                        "detail": f"PONG received from ESP32 on {settings.bluetooth_port}. (Reset from {prev_fails} misses)"
                    })
                    print(f"[Monitor Worker] Check PASSED @ {now_iso}. Consec failures reset to 0.")

                else:
                    self._active_session["consecutive_failures"] += 1
                    fails = self._active_session["consecutive_failures"]
                    warning_text = f"Check failed ({fails}/{settings.max_consecutive_failures}): ESP32 did not respond on {settings.bluetooth_port}."

                    self._active_session["check_history"].append({
                        "timestamp": now_iso,
                        "success": False,
                        "detail": warning_text
                    })

                    print(f"[Monitor Worker] Check FAILED ({fails}/{settings.max_consecutive_failures}) @ {now_iso}: {ping_resp}")
                    bt_manager.trigger_auto_reconnect()

                    if fails == 1:
                        self._active_session["status"] = "WARNING"
                        self._active_session["warnings"].append({
                            "warning_number": 1,
                            "timestamp": now_iso,
                            "message": "Warning 1: ESP32 Bluetooth disconnected or unreachable."
                        })
                    elif fails == 2:
                        self._active_session["status"] = "WARNING"
                        self._active_session["warnings"].append({
                            "warning_number": 2,
                            "timestamp": now_iso,
                            "message": "Warning 2: Second consecutive Bluetooth failure. Return to classroom proximity immediately!"
                        })
                    elif fails >= settings.max_consecutive_failures:
                        print(f"[Monitor Worker] 3 CONSECUTIVE FAILURES REACHED for {self._active_session['student_id']}. Marking ABSENT.")
                        self._active_session["status"] = "ABSENT"
                        self._active_session["end_time"] = now_iso
                        self._active_session["warnings"].append({
                            "warning_number": 3,
                            "timestamp": now_iso,
                            "message": "Penalty Applied: 3 consecutive Bluetooth check failures. Marked ABSENT."
                        })

                        db.add_attendance_record(dict(self._active_session))
                        db.save_session(self._active_session)

                        self._stop_event.set()
                        return

                db.save_session(self._active_session)

session_manager = SessionManager()
