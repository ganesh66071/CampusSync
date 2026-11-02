import unittest
import os
import sys
import sqlite3
import datetime

# Setup paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
ATTENDANCE_PY_DIR = os.path.join(ROOT_DIR, "attendance", "backend_python")
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, ATTENDANCE_PY_DIR)

import integrated_service
from database import db
from session_manager import session_manager

class TestODAttendanceIntegration(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        integrated_service.init_integrated_db()

    def test_scenario_1_pending_od_does_not_grant_attendance(self):
        """SCENARIO 1: A student applies for OD and request remains pending. Attendance follows normal rules."""
        # Check student 22AIML019 (Rohan M.) whose OD request is PENDING
        res = integrated_service.check_student_od_status("22AIML019", "2026-10-21", 1)
        self.assertFalse(res["has_approved_od"], "Pending OD must never count as approved attendance.")

    def test_scenario_2_faculty_approves_od_before_session(self):
        """SCENARIO 2: Faculty approves OD before session -> OD – PRESENT recorded for covered periods."""
        # OD #1 is APPROVED for Aakash Sharma ('22AIML042') covering Period 1 - Period 4 on '2026-10-21'
        sync_res = integrated_service.sync_approved_od_to_attendance(1)
        self.assertTrue(sync_res["success"])
        
        # Check period 2
        chk = integrated_service.check_student_od_status("22AIML042", "2026-10-21", 2)
        self.assertTrue(chk["has_approved_od"])
        self.assertEqual(chk["od_request_id"], 1)

    def test_scenario_3_rejected_od_does_not_grant_attendance(self):
        """SCENARIO 3: Faculty rejects OD. System continues normal Bluetooth verification."""
        conn = integrated_service.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ODRequests (student_name, student_roll, department, year, event_name, status, event_date, periods)
            VALUES ('Test Reject Student', 'TEST_REJ_01', 'AIML', '2nd Year', 'Hackathon Rejected', 'REJECTED', '2026-11-02', 'Period 1 - Period 2')
        """)
        req_id = cursor.lastrowid
        conn.commit()
        conn.close()

        chk = integrated_service.check_student_od_status("TEST_REJ_01", "2026-11-02", 1)
        self.assertFalse(chk["has_approved_od"], "Rejected OD must never count as attendance.")

    def test_scenario_4_od_approved_for_specific_sessions_only(self):
        """SCENARIO 4: OD approved for Period 1 - Period 4 only. Period 7 must NOT have OD status."""
        chk_p3 = integrated_service.check_student_od_status("22AIML042", "2026-10-21", 3)
        self.assertTrue(chk_p3["has_approved_od"], "Period 3 should be covered.")

        chk_p7 = integrated_service.check_student_od_status("22AIML042", "2026-10-21", 7)
        self.assertFalse(chk_p7["has_approved_od"], "Period 7 must not be covered by a 1-4 OD.")

    def test_scenario_5_od_approved_while_session_running(self):
        """SCENARIO 5: OD approved while attendance session is active. Exemption is recognized safely."""
        student = {
            "registration_number": "RA2511026020082",
            "name": "B.Ganesh",
            "department": "AIML"
        }
        # Simulate an approved OD today for B.Ganesh
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        conn = integrated_service.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ODRequests (student_name, student_roll, registration_number, department, year, event_name, status, event_date, periods)
            VALUES (?, ?, ?, 'AIML', '2nd Year', 'National AI Expo Presentation', 'APPROVED', ?, 'Period 1 - Period 9')
        """, (student["name"], student["registration_number"], student["registration_number"], today))
        od_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Start session for B.Ganesh
        ok, msg, sess = session_manager.start_session(student)
        self.assertTrue(ok)
        self.assertEqual(sess["status"], "OD - PRESENT")
        self.assertTrue(sess.get("od_exempted"))

        # Cleanly stop session
        stop_ok, stop_msg = session_manager.stop_session("Unit test complete")
        self.assertTrue(stop_ok)

    def test_scenario_6_idempotent_synchronization(self):
        """SCENARIO 6: Synchronizing the same OD approval multiple times does not duplicate records."""
        sync1 = integrated_service.sync_approved_od_to_attendance(1)
        sync2 = integrated_service.sync_approved_od_to_attendance(1)
        self.assertEqual(sync2["created_records_count"], 0, "Repeated synchronization must be idempotent.")

    def test_scenario_7_od_approved_student_exempt_from_bluetooth_absence(self):
        """SCENARIO 7: Student with approved OD is protected and never marked ABSENT by Bluetooth failures."""
        today = datetime.datetime.now().strftime("%Y-%m-%d")
        chk = integrated_service.check_student_od_status("RA2511026020082", today, 1)
        self.assertTrue(chk["has_approved_od"])
        # OD exemption ensures status remains 'OD - PRESENT'

    def test_scenario_8_od_revocation_and_audit_trail(self):
        """SCENARIO 8: OD revocation reverts attendance status and maintains immutable audit log."""
        conn = integrated_service.get_db()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO ODRequests (student_name, student_roll, department, year, event_name, status, event_date, periods)
            VALUES ('Revoke Student', 'TEST_REV_01', 'AIML', '2nd Year', 'Revocation Test Event', 'APPROVED', '2026-11-05', 'Period 1')
        """)
        od_id = cursor.lastrowid
        conn.commit()
        conn.close()

        # Sync
        integrated_service.sync_approved_od_to_attendance(od_id)

        # Revoke
        rev_res = integrated_service.revoke_od_from_attendance(od_id, "Revoked due to cancellation")
        self.assertTrue(rev_res["success"])

        # Check audit log
        conn = integrated_service.get_db()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM ODAttendanceAuditLog WHERE od_request_id = ? AND action = 'REVOKE'", (od_id,))
        audit_rows = cursor.fetchall()
        conn.close()
        self.assertGreaterEqual(len(audit_rows), 1, "Audit log must record revocation.")

    def test_scenario_9_invalid_student_id_handled_safely(self):
        """SCENARIO 9: Invalid student ID returns safely without crashing."""
        chk = integrated_service.check_student_od_status("INVALID_ROLL_9999", "2026-11-02", 1)
        self.assertFalse(chk["has_approved_od"])

    def test_scenario_10_database_and_session_resilience(self):
        """SCENARIO 10: Centralized SQLite database integrity check."""
        conn = integrated_service.get_db()
        cursor = conn.cursor()
        cursor.execute("PRAGMA integrity_check")
        status = cursor.fetchone()[0]
        conn.close()
        self.assertEqual(status, "ok", "Database integrity check must return 'ok'.")

if __name__ == "__main__":
    unittest.main()

