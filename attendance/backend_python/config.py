import os
import json
from pathlib import Path
from typing import Dict, Any

class Settings:
    def __init__(self):
        env_file = Path(__file__).parent / "config.env"
        self._env = {}
        if env_file.exists():
            with open(env_file, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        self._env[k.strip()] = v.strip()

    def get(self, key: str, default: Any = None) -> Any:
        return os.environ.get(key, self._env.get(key, default))

    @property
    def bluetooth_port(self) -> str:
        return self.get("BLUETOOTH_PORT", "AUTO")

    def set_bluetooth_port(self, port_name: str, persist: bool = True):
        self._env["BLUETOOTH_PORT"] = port_name
        os.environ["BLUETOOTH_PORT"] = port_name
        if persist:
            env_file = Path(__file__).parent / "config.env"
            if env_file.exists():
                try:
                    with open(env_file, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                    updated = False
                    new_lines = []
                    for line in lines:
                        if line.strip().startswith("BLUETOOTH_PORT="):
                            new_lines.append(f"BLUETOOTH_PORT={port_name}\n")
                            updated = True
                        else:
                            new_lines.append(line)
                    if not updated:
                        new_lines.append(f"\nBLUETOOTH_PORT={port_name}\n")
                    with open(env_file, "w", encoding="utf-8") as f:
                        f.writelines(new_lines)
                except Exception as e:
                    print(f"[Settings] Error persisting port to config.env: {e}")

    @property
    def usb_debug_port(self) -> str:
        return self.get("USB_DEBUG_PORT", "COM13")

    @property
    def baud_rate(self) -> int:
        return int(self.get("BAUD_RATE", 115200))

    @property
    def test_mode(self) -> bool:
        return self.get("TEST_MODE", "false").lower() in ("true", "1", "yes")

    @property
    def heartbeat_interval(self) -> int:
        if self.test_mode:
            return int(self.get("TEST_HEARTBEAT_INTERVAL", 15))
        return int(self.get("HEARTBEAT_INTERVAL", 300))

    @property
    def heartbeat_timeout(self) -> float:
        return float(self.get("HEARTBEAT_TIMEOUT", 3.0))

    @property
    def max_consecutive_failures(self) -> int:
        return int(self.get("MAX_CONSECUTIVE_FAILURES", 3))

    @property
    def server_host(self) -> str:
        return self.get("SERVER_HOST", "127.0.0.1")

    @property
    def server_port(self) -> int:
        return int(self.get("SERVER_PORT", 8000))

    @property
    def cors_origins(self) -> list:
        raw = self.get("CORS_ORIGINS", '["http://localhost:5173", "http://127.0.0.1:5173"]')
        try:
            return json.loads(raw)
        except Exception:
            return ["http://localhost:5173", "http://127.0.0.1:5173"]

settings = Settings()
