/*
 * ESP32 Smart Classroom Attendance System - Windows Bluetooth Classic SPP Firmware
 * Hardware Target: NodeMCU ESP32S (ESP32-D0WD-V3, Dual-Core Xtensa LX6)
 * Operating System: Windows 10 / Windows 11
 *
 * SPECIFICATION & WINDOWS BEHAVIOR:
 * 1. Advertised Name: ESP32_ATTENDANCE
 * 2. Profile: Bluetooth Classic Serial Port Profile (SPP, UUID 0x1101)
 * 3. Pairing Mode: Secure Simple Pairing (SSP) with "Just Works" mode.
 *    Windows displays: "Pair with ESP32_ATTENDANCE? [Pair]".
 *    ESP32 auto-confirms so pairing succeeds with a single tap in Windows Settings.
 * 4. Windows RFCOMM Serial Model:
 *    In Windows, Bluetooth SPP devices do not hold a permanent 24/7 radio connection.
 *    Windows establishes the actual RFCOMM over-the-air link on-demand when the
 *    assigned virtual COM port is opened by any serial application (e.g., student app,
 *    attendance runner, PuTTY, or Python).
 * 5. Persistent Discoverability:
 *    Maintains GAP connectable and general discoverable scan mode across disconnects.
 * 6. Diagnostics:
 *    Full diagnostic output on USB Serial (COM13, 115200 baud).
 */

#include "BluetoothSerial.h"
#include "esp_bt_main.h"
#include "esp_bt_device.h"
#include "esp_gap_bt_api.h"
#include "esp_spp_api.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error "Bluetooth is not enabled! Please ensure Bluetooth is enabled in Tools menu."
#endif

#if !defined(CONFIG_BT_SPP_ENABLED)
#error "Serial Port Profile (SPP) is not enabled on this chip."
#endif

// Official Advertised Bluetooth Device Name for Windows Settings
const char* DEVICE_NAME = "ESP32_ATTENDANCE";

BluetoothSerial SerialBT;

// Internal State
bool isClientConnected = false;
bool isSessionActive = false;
String currentSessionId = "";
String currentStudentId = "";
unsigned long sessionStartTime = 0;
unsigned long lastHeartbeatTime = 0;
unsigned long heartbeatCount = 0;

// Command Parser Buffer
String inputBuffer = "";

// -----------------------------------------------------------------------------
// Windows Bluetooth Pairing Callbacks (SSP Just Works)
// -----------------------------------------------------------------------------

// Triggered when Windows sends numeric comparison request during pairing
void BTConfirmRequestCallback(uint32_t numVal) {
  Serial.println("\n[BT PAIRING] Windows pairing request received.");
  Serial.printf("[BT PAIRING] Numeric validation code: %06lu\n", (unsigned long)numVal);
  Serial.println("[BT PAIRING] Auto-confirming pairing ('Just Works' mode for Windows)...");
  
  // Auto-confirm numeric comparison so students do not need a terminal open
  SerialBT.confirmReply(true);
}

// Triggered when authentication/bonding completes
void BTAuthCompleteCallback(boolean success) {
  if (success) {
    Serial.println("[BT PAIRING] >>> Windows pairing successful! Device is bonded. <<<");
    Serial.printf("[BT PAIRING] Total bonded devices: %d\n", SerialBT.getNumberOfBondedDevices());
  } else {
    Serial.println("[BT PAIRING] <<< Windows pairing failed or was rejected. <<<");
  }
}

// -----------------------------------------------------------------------------
// Bluetooth SPP Server Connection / Disconnection Callbacks
// -----------------------------------------------------------------------------
void BTSPPCallback(esp_spp_cb_event_t event, esp_spp_cb_param_t *param) {
  switch (event) {
    case ESP_SPP_SRV_OPEN_EVT:
      if (param->srv_open.status == ESP_SPP_SUCCESS) {
        isClientConnected = true;
        Serial.println("\n=======================================================");
        Serial.println(">>> [BT SPP] WINDOWS CLIENT CONNECTED TO SERIAL CHANNEL! <<<");
        char bdaStr[18];
        snprintf(bdaStr, sizeof(bdaStr), "%02X:%02X:%02X:%02X:%02X:%02X",
                 param->srv_open.rem_bda[0], param->srv_open.rem_bda[1], param->srv_open.rem_bda[2],
                 param->srv_open.rem_bda[3], param->srv_open.rem_bda[4], param->srv_open.rem_bda[5]);
        Serial.printf("[BT SPP] Windows Client MAC: %s\n", bdaStr);
        Serial.printf("[BT SPP] Active Client Handle: %lu\n", (unsigned long)param->srv_open.handle);
        Serial.println("=======================================================");
      }
      break;

    case ESP_SPP_CLOSE_EVT:
      isClientConnected = false;
      Serial.println("\n=======================================================");
      Serial.println("<<< [BT SPP] WINDOWS CLIENT CLOSED SERIAL PORT! <<<");
      // Keep device discoverable and connectable for immediate reconnection
      esp_bt_gap_set_scan_mode(ESP_BT_CONNECTABLE, ESP_BT_GENERAL_DISCOVERABLE);
      Serial.println("[BT SPP] Ready for next incoming serial connection.");
      Serial.println("=======================================================");
      break;

    case ESP_SPP_DATA_IND_EVT:
      // Data received via SPP
      break;

    default:
      break;
  }
}

// -----------------------------------------------------------------------------
// Command Dispatcher (Attendance & Diagnostic Commands)
// -----------------------------------------------------------------------------
void processCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  Serial.print("[RX on Bluetooth] <-- ");
  Serial.println(cmd);

  // 1. PING -> PONG Heartbeat Check
  if (cmd.equalsIgnoreCase("PING")) {
    heartbeatCount++;
    lastHeartbeatTime = millis();
    SerialBT.println("PONG");
    Serial.print("[TX on Bluetooth] --> PONG (Count: ");
    Serial.print(heartbeatCount);
    Serial.println(")");
  }
  
  // 2. START SESSION: "START_SESSION:student_id:session_id"
  else if (cmd.startsWith("START_SESSION")) {
    isSessionActive = true;
    sessionStartTime = millis();
    heartbeatCount = 0;

    int firstColon = cmd.indexOf(':');
    if (firstColon != -1) {
      int secondColon = cmd.indexOf(':', firstColon + 1);
      if (secondColon != -1) {
        currentStudentId = cmd.substring(firstColon + 1, secondColon);
        currentSessionId = cmd.substring(secondColon + 1);
      } else {
        currentStudentId = cmd.substring(firstColon + 1);
        currentSessionId = "SESS_" + String(millis());
      }
    } else {
      currentStudentId = "UNKNOWN";
      currentSessionId = "SESS_" + String(millis());
    }

    SerialBT.println("SESSION_STARTED:" + currentSessionId);
    Serial.println("[TX on Bluetooth] --> SESSION_STARTED:" + currentSessionId);
    Serial.print("[INFO] Active session recorded for student: ");
    Serial.println(currentStudentId);
  }

  // 3. STOP SESSION
  else if (cmd.startsWith("STOP_SESSION")) {
    isSessionActive = false;
    SerialBT.println("SESSION_STOPPED:" + currentSessionId);
    Serial.println("[TX on Bluetooth] --> SESSION_STOPPED:" + currentSessionId);
    currentSessionId = "";
    currentStudentId = "";
  }

  // 4. STATUS QUERY
  else if (cmd.equalsIgnoreCase("GET_STATUS")) {
    String statusStr = "STATUS:";
    statusStr += isSessionActive ? "ACTIVE" : "IDLE";
    statusStr += ":STUDENT=" + (currentStudentId.length() > 0 ? currentStudentId : "NONE");
    statusStr += ":PINGS=" + String(heartbeatCount);
    statusStr += ":CONNECTED=" + String(isClientConnected ? "YES" : "NO");
    SerialBT.println(statusStr);
    Serial.println("[TX on Bluetooth] --> " + statusStr);
  }

  // 5. UNRECOGNIZED COMMAND
  else {
    SerialBT.println("ERROR:UNKNOWN_COMMAND");
    Serial.println("[TX on Bluetooth] --> ERROR:UNKNOWN_COMMAND");
  }
}

// -----------------------------------------------------------------------------
// Arduino Setup
// -----------------------------------------------------------------------------
void setup() {
  // Local hardware debugging over USB Bridge on COM13
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=======================================================");
  Serial.println("  ESP32 ATTENDANCE SYSTEM - WINDOWS BLUETOOTH SPP     ");
  Serial.println("  Board: NodeMCU ESP32S (ESP32-D0WD-V3)               ");
  Serial.printf ("  Advertised Device Name: %s\n", DEVICE_NAME);
  Serial.println("  USB Diagnostic Port: COM13 (115200 baud)             ");
  Serial.println("=======================================================");

  // 1. Configure Simple Secure Pairing with NoInput / NoOutput
  // This enables "Just Works" association model for Windows 10/11:
  // When user clicks "Pair", Windows completes pairing without passkey entry.
  SerialBT.enableSSP(false, false);

  // 2. Register pairing confirmation and completion callbacks
  SerialBT.onConfirmRequest(BTConfirmRequestCallback);
  SerialBT.onAuthComplete(BTAuthCompleteCallback);

  // 3. Register SPP server callback for connection/disconnection tracking
  SerialBT.register_callback(BTSPPCallback);

  // 4. Initialize Bluetooth Classic Serial Port Profile stack
  if (SerialBT.begin(DEVICE_NAME)) {
    Serial.println("[BT STATUS] Bluetooth Classic SPP stack initialized.");
    Serial.printf("[BT STATUS] Device Name: %s\n", DEVICE_NAME);
    Serial.println("[BT STATUS] SPP Serial Service registered (UUID: 0x1101).");
  } else {
    Serial.println("[BT ERROR] Failed to start Bluetooth Classic stack!");
    return;
  }

  // 5. Explicitly declare device as General Discoverable and Connectable
  esp_bt_gap_set_scan_mode(ESP_BT_CONNECTABLE, ESP_BT_GENERAL_DISCOVERABLE);
  Serial.println("[BT STATUS] GAP Mode: Discoverable & Connectable for Windows.");

  // 6. Print local Bluetooth Hardware MAC Address
  const uint8_t* mac = esp_bt_dev_get_address();
  if (mac) {
    Serial.printf("[BT HARDWARE MAC] %02X:%02X:%02X:%02X:%02X:%02X\n",
                  mac[0], mac[1], mac[2], mac[3], mac[4], mac[5]);
  }
  Serial.printf("[BT BONDED] Paired devices stored in NVRAM: %d\n", SerialBT.getNumberOfBondedDevices());
  Serial.println("=======================================================\n");
}

// -----------------------------------------------------------------------------
// Arduino Main Loop
// -----------------------------------------------------------------------------
void loop() {
  // Read incoming characters from Windows Bluetooth SPP client
  while (SerialBT.available()) {
    char c = (char)SerialBT.read();
    if (c == '\n' || c == '\r') {
      if (inputBuffer.length() > 0) {
        processCommand(inputBuffer);
        inputBuffer = "";
      }
    } else {
      if (inputBuffer.length() < 128) {
        inputBuffer += c;
      }
    }
  }

  // Local loop delay to feed FreeRTOS watchdog & idle task
  delay(10);
}
