import unittest
import time
from database import db
from session_manager import SessionManager
from config import settings

class DummyBTManager:
    def __init__(self, ping_responses=None):
        self.ping_responses = ping_responses or [True, True, True]
        self.ping_call_count = 0
        self.connected = True

    def connect(self):
        return True, "Mock connected"

    def ping(self):
        if self.ping_call_count < len(self.ping_responses):
            resp = self.ping_responses[self.ping_call_count]
        else:
            resp = False
        self.ping_call_count += 1
        if resp:
            return True, "PONG"
        return False, "Simulated Timeout/Disconnected"

    def start_session_hw(self, student_id, session_id):
        return True, f"SESSION_STARTED:{session_id}"

    def stop_session_hw(self):
        return True, "SESSION_STOPPED"

class TestSessionWatchdogRules(unittest.TestCase):
    def test_consecutive_failure_rule_to_absent(self):
        settings._env["TEST_MODE"] = "true"
        settings._env["TEST_HEARTBEAT_INTERVAL"] = "1"
        settings._env["MAX_CONSECUTIVE_FAILURES"] = "3"

        mock_bt = DummyBTManager(ping_responses=[True, False, False, False])
        
        import session_manager as sm_mod
        original_bt = sm_mod.bt_manager
        sm_mod.bt_manager = mock_bt

        try:
            mgr = SessionManager()
            student = {
                "registration_number": "RA25TEST001",
                "name": "Test Student",
                "department": "AIML"
            }
            
            ok, msg, sess = mgr.start_session(student)
            self.assertTrue(ok)
            self.assertEqual(sess["status"], "MONITORING")

            # Wait for 3 failure cycles (each 1s) + buffer
            time.sleep(3.8)

            current = mgr.get_current_session()
            self.assertIsNotNone(current)
            self.assertEqual(current["status"], "ABSENT")
            self.assertGreaterEqual(current["consecutive_failures"], 3)
            self.assertEqual(len(current["warnings"]), 3)
            self.assertEqual(current["warnings"][0]["warning_number"], 1)
            self.assertEqual(current["warnings"][1]["warning_number"], 2)
            self.assertEqual(current["warnings"][2]["warning_number"], 3)
            print("[PASS] Verified: 1st fail -> Warn 1, 2nd fail -> Warn 2, 3rd fail -> ABSENT.")
        finally:
            mgr.stop_session("Test cleanup")
            sm_mod.bt_manager = original_bt

    def test_recovery_resets_failures(self):
        settings._env["TEST_MODE"] = "true"
        settings._env["TEST_HEARTBEAT_INTERVAL"] = "1"

        mock_bt = DummyBTManager(ping_responses=[True, False, True, True])
        
        import session_manager as sm_mod
        original_bt = sm_mod.bt_manager
        sm_mod.bt_manager = mock_bt

        try:
            mgr = SessionManager()
            student = {
                "registration_number": "RA25TEST002",
                "name": "Recovery Student",
                "department": "AIML"
            }
            
            ok, msg, sess = mgr.start_session(student)
            self.assertTrue(ok)

            time.sleep(1.2)
            current = mgr.get_current_session()
            self.assertEqual(current["status"], "WARNING")
            self.assertEqual(current["consecutive_failures"], 1)

            time.sleep(1.2)
            current2 = mgr.get_current_session()
            self.assertEqual(current2["status"], "MONITORING")
            self.assertEqual(current2["consecutive_failures"], 0)
            print("[PASS] Verified: Successful heartbeat resets consecutive failure count to 0.")
        finally:
            mgr.stop_session("Test cleanup")
            sm_mod.bt_manager = original_bt

if __name__ == '__main__':
    unittest.main()
