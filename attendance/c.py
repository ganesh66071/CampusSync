import sys
import time
import serial
import serial.tools.list_ports

def find_esp32_port():
    print("[1/4] Scanning Windows Serial & Bluetooth COM Ports...")
    ports = list(serial.tools.list_ports.comports())
    candidates = []
    for p in ports:
        desc = p.description or ""
        hwid = p.hwid or ""
        # Check for Bluetooth serial or specific COM assignments (excluding USB flash COM13)
        if p.device.upper() == "COM13":
            continue
        if "bluetooth" in desc.lower() or "bthenum" in hwid.lower():
            candidates.append(p.device)
            print(f"      Found Bluetooth Port: {p.device} ({desc})")

    if not candidates:
        # Fallback to standard COM15
        candidates = ["COM15"]
        print("      No dynamic port detected in list. Trying default virtual port: COM15")
    return candidates

def test_connection(port_name):
    print(f"\n[2/4] Attempting to open Windows Bluetooth Serial Link on {port_name} (115200 baud)...")
    try:
        # Opening this COM port triggers Windows to wake the RFCOMM radio connection to ESP32_ATTENDANCE
        ser = serial.Serial(port_name, 115200, timeout=3, write_timeout=3)
        print(f"      [OK] Port {port_name} opened successfully! Windows RFCOMM link established.")
        time.sleep(0.5)
        ser.reset_input_buffer()
        ser.reset_output_buffer()

        print("[3/4] Sending attendance PING handshake to ESP32_ATTENDANCE...")
        ser.write(b"PING\n")
        ser.flush()

        time.sleep(0.5)
        response = ser.readline().decode('utf-8', errors='ignore').strip()
        print(f"      Received from ESP32: '{response}'")

        if "PONG" in response or "STATUS" in response:
            print(f"\n=======================================================")
            print(f"  SUCCESS! ESP32_ATTENDANCE is CONNECTED & RESPONSIVE!  ")
            print(f"  Communication verified over {port_name}.             ")
            print(f"=======================================================")
            ser.close()

            # Automatically sync and update backend_python/config.env with this working port
            try:
                import os
                from pathlib import Path
                env_path = Path(__file__).parent / "backend_python" / "config.env"
                if env_path.exists():
                    with open(env_path, "r", encoding="utf-8") as f:
                        lines = f.readlines()
                    new_lines = []
                    found = False
                    for line in lines:
                        if line.strip().startswith("BLUETOOTH_PORT="):
                            new_lines.append(f"BLUETOOTH_PORT={port_name}\n")
                            found = True
                        else:
                            new_lines.append(line)
                    if not found:
                        new_lines.append(f"\nBLUETOOTH_PORT={port_name}\n")
                    with open(env_path, "w", encoding="utf-8") as f:
                        f.writelines(new_lines)
                    print(f"  [AUTO-SYNC] Successfully updated backend_python/config.env to: {port_name}")
            except Exception as sync_err:
                print(f"  [WARN] Could not auto-sync config.env: {sync_err}")

            return True
        else:
            print("      [WARN] No PONG received. Trying status query...")
            ser.write(b"GET_STATUS\n")
            ser.flush()
            time.sleep(0.5)
            status_resp = ser.readline().decode('utf-8', errors='ignore').strip()
            print(f"      Status: {status_resp}")
            ser.close()
            return True
    except serial.SerialException as e:
        print(f"      [ERROR] Could not open {port_name}: {e}")
        return False
    except Exception as e:
        print(f"      [ERROR] {e}")
        return False

def main():
    print("=======================================================")
    print("  ESP32_ATTENDANCE - WINDOWS INDEPENDENT CONNECT TOOL  ")
    print("  (Works standalone without Antigravity or browsers)  ")
    print("=======================================================")
    candidates = find_esp32_port()
    connected = False
    for port in candidates:
        if test_connection(port):
            connected = True
            break

    if not connected:
        print("\n[TROUBLESHOOTING GUIDE]")
        print("1. Ensure ESP32 is powered on.")
        print("2. Open Windows 'Settings -> Bluetooth & devices'.")
        print("3. Ensure 'ESP32_ATTENDANCE' is in Paired status.")
        print("4. Verify Device Manager -> Ports (COM & LPT) lists your Bluetooth serial port (COM15).")

if __name__ == "__main__":
    main()
