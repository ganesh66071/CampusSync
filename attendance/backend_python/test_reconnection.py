import unittest
import time
from unittest.mock import MagicMock, patch
import serial

from bluetooth_manager import BluetoothManager

class MockSerialDevice:
    """Simulates a physical ESP32 Bluetooth Classic SPP virtual serial port."""
    def __init__(self, port, baudrate, timeout=3.0, write_timeout=3.0):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.is_open = True
        self.in_waiting = 0
        self.fail_write = False
        self.fail_read = False
        self.last_written = b""
        self.responses = []

    def write(self, data):
        if self.fail_write:
            raise serial.SerialException("Simulated write error: device detached / Bluetooth off")
        self.last_written = data
        if b"PING" in data:
            self.responses.append(b"PONG\n")
        elif b"START_SESSION" in data:
            self.responses.append(b"SESSION_STARTED:SESS_123\n")
        elif b"STOP_SESSION" in data:
            self.responses.append(b"SESSION_STOPPED\n")
        return len(data)

    def flush(self):
        if not self.is_open:
            raise serial.SerialException("Port closed")

    def readline(self):
        if self.fail_read:
            raise serial.SerialException("Simulated read error: connection reset")
        if self.responses:
            return self.responses.pop(0)
        return b""

    def reset_input_buffer(self):
        self.responses.clear()

    def reset_output_buffer(self):
        pass

    def cancel_read(self):
        pass

    def cancel_write(self):
        pass

    def close(self):
        self.is_open = False


class TestBluetoothManagerReconnection(unittest.TestCase):

    def setUp(self):
        self.bm = BluetoothManager()
        self.bm._port = "COM14"

    def tearDown(self):
        self.bm.disconnect()

    @patch("serial.tools.list_ports.comports")
    @patch("serial.Serial")
    def test_initial_successful_connection_and_ping(self, mock_serial_cls, mock_comports):
        # Setup mock ports list containing COM14
        port_mock = MagicMock()
        port_mock.device = "COM14"
        mock_comports.return_value = [port_mock]

        # Setup mock serial instance
        mock_dev = MockSerialDevice("COM14", 115200)
        mock_serial_cls.return_value = mock_dev

        ok, msg = self.bm.connect()
        self.assertTrue(ok)
        self.assertEqual(self.bm.state, BluetoothManager.STATE_CONNECTED)

        # Test PING -> PONG
        ping_ok, ping_resp = self.bm.ping()
        self.assertTrue(ping_ok)
        self.assertEqual(ping_resp, "PONG")
        print("[TEST PASS] 1. Initial connection & PING/PONG successful.")

    @patch("serial.tools.list_ports.comports")
    @patch("serial.Serial")
    def test_bluetooth_disabled_triggers_disconnect_cleanup(self, mock_serial_cls, mock_comports):
        port_mock = MagicMock()
        port_mock.device = "COM14"
        mock_comports.return_value = [port_mock]

        mock_dev = MockSerialDevice("COM14", 115200)
        mock_serial_cls.return_value = mock_dev

        # Initial connect
        self.bm.connect()
        self.assertTrue(self.bm.is_connected)

        # Simulate Bluetooth switch OFF: next write or read throws SerialException
        mock_dev.fail_write = True

        ok, resp = self.bm.ping()
        self.assertFalse(ok)
        self.assertEqual(self.bm.state, BluetoothManager.STATE_DISCONNECTED)
        self.assertIsNone(self.bm._serial, "Stale serial handle should be closed and set to None")
        print("[TEST PASS] 2. Bluetooth switch-off drops link, safely clears stale handle and sets DISCONNECTED.")

    @patch("serial.tools.list_ports.comports")
    def test_com14_temporarily_unavailable_when_bt_off(self, mock_comports):
        # When Windows Bluetooth is OFF, COM14 is absent from comports
        usb_mock = MagicMock()
        usb_mock.device = "COM13"
        mock_comports.return_value = [usb_mock] # Only COM13 exists

        ok, msg = self.bm.connect()
        self.assertFalse(ok)
        self.assertIn("not currently recognized by Windows", msg)
        self.assertEqual(self.bm.state, BluetoothManager.STATE_DISCONNECTED)
        print("[TEST PASS] 3. Gracefully rejects connection when COM14 is unmounted by Windows.")

    @patch("serial.tools.list_ports.comports")
    @patch("serial.Serial")
    def test_reconnection_when_com14_restored(self, mock_serial_cls, mock_comports):
        # Step A: Bluetooth OFF (only COM13)
        mock_comports.return_value = [MagicMock(device="COM13")]
        ok, _ = self.bm.connect()
        self.assertFalse(ok)

        # Step B: Bluetooth turned ON again, COM14 reappears
        mock_comports.return_value = [MagicMock(device="COM13"), MagicMock(device="COM14")]
        mock_dev = MockSerialDevice("COM14", 115200)
        mock_serial_cls.return_value = mock_dev

        # Step C: Reconnection succeeds with handshake
        ok, msg = self.bm.connect()
        self.assertTrue(ok)
        self.assertEqual(self.bm.state, BluetoothManager.STATE_CONNECTED)

        ping_ok, ping_resp = self.bm.ping()
        self.assertTrue(ping_ok)
        self.assertEqual(ping_resp, "PONG")
        print("[TEST PASS] 4. Successfully reconnects and re-validates PING/PONG when COM14 is restored.")

    @patch("serial.tools.list_ports.comports")
    @patch("serial.Serial")
    def test_failed_handshake_after_open(self, mock_serial_cls, mock_comports):
        mock_comports.return_value = [MagicMock(device="COM14")]
        
        # Mock device that opens but never sends PONG (e.g. hung ESP32)
        mock_dev = MockSerialDevice("COM14", 115200)
        mock_dev.write = lambda d: len(d) # No response added to responses queue
        mock_serial_cls.return_value = mock_dev

        ok, msg = self.bm.connect()
        self.assertFalse(ok)
        self.assertIn("did not respond to PING handshake", msg)
        self.assertEqual(self.bm.state, BluetoothManager.STATE_DISCONNECTED)
        self.assertIsNone(self.bm._serial, "Must close handle if handshake fails")
        print("[TEST PASS] 5. Discards connection if ESP32 fails PING handshake immediately after opening.")

    def test_never_opens_com13(self):
        self.bm._port = "COM13"
        ok, msg = self.bm.connect()
        self.assertFalse(ok)
        self.assertIn("reserved for USB flashing", msg)
        self.assertEqual(self.bm.state, BluetoothManager.STATE_ERROR)
        print("[TEST PASS] 6. Safety guard strictly blocks opening COM13.")


if __name__ == '__main__':
    unittest.main()
