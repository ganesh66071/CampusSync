import time
import threading
from typing import Optional, Tuple, Dict, Any
import serial
import serial.tools.list_ports
from config import settings

class BluetoothManager:
    """
    Robust Bluetooth Classic Serial (SPP) Connection Manager for ESP32 on COM14.
    
    Key Reliability & Auto-Recovery Features:
    1. Handles Windows RFCOMM/SPP driver cycle: When Bluetooth is toggled OFF/ON,
       Windows invalidates stale COM handles and may return PermissionError/FileNotFoundError.
    2. Stale Handle Disposal: Whenever I/O fails or Windows reports error, the previous
       serial instance is forcefully closed and released.
    3. Thread-safe Lock: All I/O and state modifications are protected against concurrent access.
    4. Controlled Auto-Reconnect Backoff: Retries at 1s, 2s, 3s, 5s, up to 10s max. Avoids CPU spin.
    5. State Reporting: CONNECTED, RECONNECTING, DISCONNECTED, ERROR.
    6. Port Guard: Strictly prohibits opening COM13 (reserved for USB flashing/debugging).
    """

    STATE_DISCONNECTED = "DISCONNECTED"
    STATE_RECONNECTING = "RECONNECTING"
    STATE_CONNECTED = "CONNECTED"
    STATE_ERROR = "ERROR"

    def __init__(self):
        self._lock = threading.Lock()
        self._serial: Optional[serial.Serial] = None
        self._state: str = self.STATE_DISCONNECTED
        self._last_heartbeat_time: Optional[float] = None
        self._last_error: Optional[str] = None
        self._port: str = settings.bluetooth_port
        self._baud: int = settings.baud_rate
        
        # Auto-reconnect thread state
        self._reconnect_thread: Optional[threading.Thread] = None
        self._stop_reconnect = threading.Event()
        self._reconnect_backoff_index = 0
        self._backoff_schedule = [1.0, 2.0, 3.0, 5.0, 10.0]

    @property
    def is_connected(self) -> bool:
        with self._lock:
            return self._state == self.STATE_CONNECTED and self._serial is not None and self._serial.is_open

    @property
    def state(self) -> str:
        with self._lock:
            return self._state

    def get_status(self) -> Dict[str, Any]:
        with self._lock:
            available_ports = [p.device.upper() for p in serial.tools.list_ports.comports()]
            port_exists = self._port.upper() in available_ports

            # Diagnostic guidance for Windows RFCOMM driver state
            diagnostic_help = ""
            if not port_exists:
                diagnostic_help = (
                    f"Windows has not mounted virtual serial port {self._port}. "
                    "When Windows Bluetooth is toggled, Windows removes the virtual COM port. "
                    "To restore it: Open Windows 'Settings -> Bluetooth & devices -> Devices', "
                    "click on ESP32_Attendance to Connect, or re-toggle Bluetooth."
                )

            return {
                "port": self._port,
                "baud_rate": self._baud,
                "state": self._state,
                "is_open": self._serial is not None and self._serial.is_open,
                "port_present_on_os": port_exists,
                "last_heartbeat": (
                    time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(self._last_heartbeat_time))
                    if self._last_heartbeat_time else None
                ),
                "last_error": self._last_error,
                "diagnostic_help": diagnostic_help,
                "usb_debug_port_reserved": settings.usb_debug_port
            }

    def _cleanup_stale_serial(self):
        """Forcefully closes and cleans up any open or lingering serial handles."""
        if self._serial:
            try:
                print(f"[BluetoothManager] Cleaning up stale serial handle for {self._port}...")
                self._serial.cancel_read()
                self._serial.cancel_write()
            except Exception:
                pass
            try:
                self._serial.close()
            except Exception:
                pass
            self._serial = None

    def _get_candidate_ports(self) -> list:
        """Finds all standard Serial over Bluetooth COM ports present in the system, excluding USB debug port."""
        candidates = []
        if self._port and self._port.upper() != "AUTO":
            candidates.append(self._port.upper())
        # Add all available Bluetooth COM ports discovered by OS
        for p in serial.tools.list_ports.comports():
            port_name = p.device.upper()
            if port_name == settings.usb_debug_port.upper():
                continue
            if 'bluetooth' in p.description.lower() or 'bthenum' in p.hwid.lower():
                if port_name not in candidates:
                    candidates.append(port_name)
        return candidates

    def _try_open_port(self, port_name: str) -> Tuple[bool, str]:
        """Attempts to open and handshake with a specific port."""
        try:
            print(f"[BluetoothManager] Probing port {port_name} at {self._baud} baud...")
            s = serial.Serial(
                port=port_name,
                baudrate=self._baud,
                timeout=settings.heartbeat_timeout,
                write_timeout=settings.heartbeat_timeout
            )
            time.sleep(0.4)
            s.reset_input_buffer()
            s.reset_output_buffer()

            s.write(b"PING\n")
            s.flush()

            start_wait = time.time()
            response = ""
            while (time.time() - start_wait) < settings.heartbeat_timeout:
                line = s.readline().decode('utf-8', errors='ignore').strip()
                if line:
                    response = line
                    break

            if response.startswith("PONG"):
                self._serial = s
                self._port = port_name
                settings.set_bluetooth_port(port_name, persist=True)
                self._state = self.STATE_CONNECTED
                self._last_heartbeat_time = time.time()
                self._last_error = None
                self._reconnect_backoff_index = 0
                print(f"[BluetoothManager] Connected to ESP32 on {port_name} (Response: {response}). Settings updated.")
                return True, f"Connected to ESP32 on {port_name}."
            else:
                s.close()
                return False, f"Port {port_name} did not reply with PONG (got '{response}')."
        except Exception as e:
            return False, f"Failed on {port_name}: {e}"

    def connect(self) -> Tuple[bool, str]:
        """
        Attempts connection to the configured port or scans available Bluetooth ports.
        Thread-safe and self-cleaning.
        """
        with self._lock:
            # Port protection check
            if self._port.upper() == settings.usb_debug_port.upper():
                err = f"CRITICAL: Port {self._port} is reserved for USB flashing & debugging. Refusing to open as Bluetooth SPP!"
                self._last_error = err
                self._state = self.STATE_ERROR
                return False, err

            self._cleanup_stale_serial()

            candidates = self._get_candidate_ports()
            if not candidates:
                self._state = self.STATE_DISCONNECTED
                self._last_error = (
                    f"No Bluetooth serial ports detected in Windows. "
                    "Ensure laptop Bluetooth is ON and ESP32_Attendance is paired in Settings."
                )
                print(f"[BluetoothManager] {self._last_error}")
                return False, self._last_error

            print(f"[BluetoothManager] Attempting connection. Candidate ports: {candidates}")
            errors = []
            for candidate in candidates:
                success, msg = self._try_open_port(candidate)
                if success:
                    return True, msg
                errors.append(msg)

            self._cleanup_stale_serial()
            self._state = self.STATE_DISCONNECTED
            self._last_error = f"ESP32 not responding on candidate ports ({', '.join(candidates)}). Latest error: {errors[-1] if errors else 'None'}."
            print(f"[BluetoothManager] Connection failed: {self._last_error}")
            return False, self._last_error

    def disconnect(self):
        with self._lock:
            self._cleanup_stale_serial()
            self._state = self.STATE_DISCONNECTED
            self._last_error = "Manually disconnected."
            print(f"[BluetoothManager] Disconnected {self._port}.")

    def send_command(self, command: str, expected_prefix: Optional[str] = None) -> Tuple[bool, str]:
        """
        Sends a command terminated with newline, reads response with timeout.
        On I/O failure, marks connection as DISCONNECTED and safely purges handle.
        """
        with self._lock:
            if not self._serial or not self._serial.is_open:
                self._state = self.STATE_DISCONNECTED
                return False, f"Port {self._port} is not open."

            try:
                self._serial.reset_input_buffer()
                msg = (command.strip() + "\n").encode('utf-8')
                self._serial.write(msg)
                self._serial.flush()

                start_wait = time.time()
                response_line = ""
                while (time.time() - start_wait) < settings.heartbeat_timeout:
                    line = self._serial.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        response_line = line
                        break

                if not response_line:
                    self._last_error = f"Timeout waiting for response to '{command}' from ESP32 on {self._port}."
                    return False, self._last_error

                if expected_prefix and not response_line.startswith(expected_prefix):
                    self._last_error = f"Unexpected response from ESP32: '{response_line}' (expected: '{expected_prefix}')."
                    return False, self._last_error

                return True, response_line

            except (serial.SerialException, OSError) as e:
                print(f"[BluetoothManager] Serial I/O dropped during command '{command}': {e}")
                self._cleanup_stale_serial()
                self._state = self.STATE_DISCONNECTED
                self._last_error = f"Bluetooth connection lost: {str(e)}"
                return False, self._last_error
            except Exception as e:
                self._cleanup_stale_serial()
                self._state = self.STATE_DISCONNECTED
                self._last_error = f"Communication error: {str(e)}"
                return False, self._last_error

    def ping(self) -> Tuple[bool, str]:
        """
        Sends 'PING' to ESP32 over Bluetooth SPP.
        Expects 'PONG'.
        """
        success, response = self.send_command("PING", expected_prefix="PONG")
        if success:
            with self._lock:
                self._last_heartbeat_time = time.time()
                self._state = self.STATE_CONNECTED
                self._last_error = None
        else:
            with self._lock:
                if self._state == self.STATE_CONNECTED:
                    self._state = self.STATE_DISCONNECTED
        return success, response

    def start_session_hw(self, student_id: str, session_id: str) -> Tuple[bool, str]:
        cmd = f"START_SESSION:{student_id}:{session_id}"
        return self.send_command(cmd, expected_prefix="SESSION_STARTED")

    def stop_session_hw(self) -> Tuple[bool, str]:
        return self.send_command("STOP_SESSION", expected_prefix="SESSION_STOPPED")

    def trigger_auto_reconnect(self):
        """Spawns background reconnection worker if not already running."""
        with self._lock:
            if self._reconnect_thread and self._reconnect_thread.is_alive():
                return
            self._stop_reconnect.clear()
            self._state = self.STATE_RECONNECTING
            self._reconnect_thread = threading.Thread(target=self._reconnect_worker, daemon=True)
            self._reconnect_thread.start()

    def _reconnect_worker(self):
        """
        Background worker that attempts reconnection with controlled backoff.
        Backoff: 1s, 2s, 3s, 5s, 10s.
        """
        print("[BluetoothManager] Auto-reconnection worker started.")
        while not self._stop_reconnect.is_set():
            backoff_delay = self._backoff_schedule[min(self._reconnect_backoff_index, len(self._backoff_schedule) - 1)]
            print(f"[BluetoothManager] Reconnection attempt in {backoff_delay}s...")
            
            interrupted = self._stop_reconnect.wait(timeout=backoff_delay)
            if interrupted:
                break

            ok, msg = self.connect()
            if ok:
                print(f"[BluetoothManager] Auto-reconnection SUCCEEDED: {msg}")
                break
            else:
                self._reconnect_backoff_index += 1
                with self._lock:
                    self._state = self.STATE_RECONNECTING
                    self._last_error = f"Reconnecting... ({msg})"

bt_manager = BluetoothManager()
