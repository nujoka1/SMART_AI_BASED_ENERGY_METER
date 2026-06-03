/*
 * ============================================================
 *  AI-BASED SMART ENERGY MONITORING & LOAD MANAGEMENT SYSTEM
 *  Block 1 — ESP32 Complete Firmware
 * ============================================================
 *  Hardware:
 *    - ESP32-WROOM-32 DevKit V1
 *    - PZEM-004T v3.0 (UART2: RX=GPIO16, TX=GPIO17)
 *    - 4-Channel Opto-Isolated Relay Module
 *    - SIM800L GSM Module (UART1: RX=GPIO4, TX=GPIO2)
 *    - Status LEDs (GPIO 32=Green, GPIO 33=Red, GPIO 13=Blue)
 *    - TFT Display (ILI9341) via SPI: CS=GPIO5, DC=GPIO23, SCL=GPIO18, SDA=GPIO19
 *
 *  Libraries required (install via Arduino Library Manager):
 *    - PZEM004Tv30 by Olexa Moskalenko
 *    - ArduinoJson v6 by Benoit Blanchon
 *    - TFT_eSPI by Bodmer (for TFT display)
 *    - WiFi.h         (built-in ESP32 core)
 *    - HTTPClient.h   (built-in ESP32 core)
 *    - WiFiClientSecure.h (built-in ESP32 core)
 *
 *  Board: ESP32 Dev Module
 *  CPU Speed: 240MHz
 *  Upload Speed: 115200
 * ============================================================
 */

// ─────────────────────────────────────────────
//  INCLUDES
// ─────────────────────────────────────────────
#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <PZEM004Tv30.h>
#include <TFT_eSPI.h>             // TFT display library

// Enable a visual TFT test mode that alternates screen color and
// prints a large test banner + uptime so we can confirm redraws.
#define TFT_VISUAL_TEST 1

// ─────────────────────────────────────────────
//  Firmware configuration (build-time)
// ─────────────────────────────────────────────
// The real credentials should live in `firmware/config.h` (excluded from VCS).
#include "firmware/config.h"

// Full base URL for HTTPS requests (constructed from FB_HOST macro)
String      FB_URL          = String("https://") + String(FB_HOST);
String      FB_ID_TOKEN     = "";
unsigned long FB_TOKEN_EXPIRES_AT = 0;
String      FB_SECRET_OVERRIDE = ""; // short-lived token fetched from token exchange

// ─────────────────────────────────────────────
//  PIN DEFINITIONS
// ─────────────────────────────────────────────

// PZEM-004T on hardware UART2
#define PZEM_RX_PIN     16
#define PZEM_TX_PIN     17

// Relay module — active LOW (HIGH = OFF, LOW = ON)
#define RELAY_Z1_PIN    26    // Zone 1: AC unit / heavy load
#define RELAY_Z2_PIN    27    // Zone 2: Water heater
#define RELAY_Z3_PIN    14    // Zone 3: General sockets
#define RELAY_Z4_PIN    12    // Zone 4: Lighting / spare

// Status LEDs
#define LED_GREEN_PIN   32    // Power OK
#define LED_RED_PIN     33    // Fault / anomaly alert
#define LED_BLUE_PIN    13    // WiFi connected

// TFT Display (SPI)
#define TFT_CS_PIN      5     // Chip Select
#define TFT_DC_PIN      23    // Data/Command
#define TFT_RST_PIN     22    // Reset
#define TFT_MOSI_PIN    19    // MOSI (data in)
#define TFT_MISO_PIN    25    // MISO (data out)
#define TFT_SCK_PIN     18    // Clock

// SIM800L on hardware UART1
#define SIM_RX_PIN      4
#define SIM_TX_PIN      2

// ─────────────────────────────────────────────
//  TIMING INTERVALS (milliseconds)
// ─────────────────────────────────────────────
#define INTERVAL_PZEM_READ      2000    // Read sensor every 2s
#define INTERVAL_FIREBASE_LIVE  5000    // Push /live every 5s
#define INTERVAL_FIREBASE_LOG   60000   // Append /history every 60s
#define INTERVAL_CMD_POLL       3000    // Poll relay commands every 3s
#define INTERVAL_WIFI_RETRY     30000   // Retry WiFi every 30s
// Heartbeat interval (device status)
#define INTERVAL_HEARTBEAT      60000   // Push /device_status every 60s

// ─────────────────────────────────────────────
//  SAFE SWITCHING PARAMETERS
// ─────────────────────────────────────────────
#define THRESHOLD_WATTS     2000.0f   // Trip threshold in watts
#define CONFIRM_HOLD_MS     10000     // Must hold above threshold for 10s
#define COOLDOWN_MS         30000     // 30s cooldown after any trip
#define ANOMALY_ZSCORE      2.5f      // Z-score trigger for anomaly flag

// ─────────────────────────────────────────────
//  PZEM OBJECT
// ─────────────────────────────────────────────
PZEM004Tv30 pzem(Serial2, PZEM_RX_PIN, PZEM_TX_PIN);
bool pzemUsingSwappedPins = false;

// ─────────────────────────────────────────────
//  TFT DISPLAY OBJECT
// ─────────────────────────────────────────────
TFT_eSPI tft = TFT_eSPI();

// ─────────────────────────────────────────────
//  RELAY ZONE STATE MACHINE
// ─────────────────────────────────────────────
struct ZoneState {
  uint8_t  pin;
  bool     relayOn;           // current physical state
  bool     tripped;           // in cooldown after auto-trip
  bool     manualOverride;    // set by dashboard command
  unsigned long overThreshSince;  // when we first exceeded threshold
  unsigned long cooldownStart;    // when cooldown began
  uint8_t  priority;         // 1 = trip first, 4 = trip last
  const char* name;
};

ZoneState zones[4] = {
  { RELAY_Z1_PIN, true, false, false, 0, 0, 1, "AC_Unit"      },
  { RELAY_Z2_PIN, true, false, false, 0, 0, 2, "Water_Heater" },
  { RELAY_Z3_PIN, true, false, false, 0, 0, 3, "Sockets"      },
  { RELAY_Z4_PIN, true, false, false, 0, 0, 4, "Lighting"     },
};

// ─────────────────────────────────────────────
//  LIVE ENERGY DATA
// ─────────────────────────────────────────────
struct EnergyReading {
  float   voltage;        // V
  float   current;        // A
  float   power;          // W
  float   energy;         // kWh (cumulative from PZEM)
  float   powerFactor;    // 0.0 – 1.0
  float   frequency;      // Hz
  bool    valid;          // false if PZEM read failed
  String  label;          // classification string
  String  labelColor;     // "green" | "amber" | "red"
};

EnergyReading live;

// ─────────────────────────────────────────────
//  ROLLING BASELINE (for Z-score anomaly)
// ─────────────────────────────────────────────
#define BASELINE_SAMPLES  60          // ~2 minutes of readings
float   baselineBuffer[BASELINE_SAMPLES];
uint8_t baselineIndex   = 0;
bool    baselineFull    = false;
float   baselineMean    = 0.0f;
float   baselineStdDev  = 0.0f;
float   anomalyZScore   = 0.0f;
bool    anomalyActive   = false;

// ─────────────────────────────────────────────
//  OFFLINE BUFFER (for WiFi drop resilience)
// ─────────────────────────────────────────────
#define OFFLINE_BUFFER_SIZE  10
String  offlineBuffer[OFFLINE_BUFFER_SIZE];
uint8_t offlineHead = 0;
uint8_t offlineCount = 0;

// ─────────────────────────────────────────────
//  TIMING TRACKERS
// ─────────────────────────────────────────────
unsigned long lastPzemRead     = 0;
unsigned long lastFirebaseLive = 0;
unsigned long lastFirebaseLog  = 0;
unsigned long lastCmdPoll      = 0;
unsigned long lastWifiRetry    = 0;
unsigned long lastSmsSent      = 0;
unsigned long lastHeartbeat    = 0;

// ─────────────────────────────────────────────
//  SMS COOLDOWN (prevent SMS spam)
// ─────────────────────────────────────────────
#define SMS_COOLDOWN_MS   300000   // max one SMS per 5 minutes

// ─────────────────────────────────────────────
//  FIREBASE RELAY COMMAND CACHE
// ─────────────────────────────────────────────
bool lastCmdState[4] = {true, true, true, true};

// ─────────────────────────────────────────────
//  FORWARD DECLARATIONS
// ─────────────────────────────────────────────
void     connectWiFi();
bool     readPZEM();
String   classifyLoad(float watts);
void     updateBaseline(float watts);
void     runRelayStateMachine();
void     setZoneRelay(uint8_t zone, bool on, const char* reason);
void     pushFirebaseLive();
void     appendFirebaseHistory();
void     pushEventToFirebase(uint8_t zone, const char* event, float watts);
void     pollRelayCommands();
bool     firebaseSignInAnonymous();
bool     ensureFirebaseAuth();
String   firebaseAuthQuery();
bool     firebasePut(const String& path, const String& jsonBody);
bool     firebasePost(const String& path, const String& jsonBody);
String   firebaseGet(const String& path);
void     sendSmsAlert(const String& message);
void     simSendAT(const String& cmd, uint32_t waitMs);
void     blinkLed(uint8_t pin, uint8_t times);
void     setStatusLeds();
void     updateTFTDisplay();
void     drawTFTMetrics();
void     configurePzemSerial(bool swappedPins, int baud);
void     plotTelemetry();  // Output Teleplot telemetry for VSCode graphing

// ════════════════════════════════════════════
//  SETUP
// ════════════════════════════════════════════
void setup() {
  Serial.begin(115200);
  Serial.println("\n\n=== SMART ENERGY MONITOR BOOTING ===");

  // ── GPIO init ─────────────────────────────
  // Relay pins — set HIGH first (relay OFF) before pinMode
  // This prevents a momentary LOW glitch on boot
  for (uint8_t i = 0; i < 4; i++) {
    digitalWrite(zones[i].pin, HIGH);
    pinMode(zones[i].pin, OUTPUT);
    digitalWrite(zones[i].pin, HIGH);   // double-set for safety
  }

  // LED pins
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN,   OUTPUT);
  pinMode(LED_BLUE_PIN,  OUTPUT);
  digitalWrite(LED_GREEN_PIN, HIGH);   // power-on indicator
  digitalWrite(LED_RED_PIN,   LOW);
  digitalWrite(LED_BLUE_PIN,  LOW);

  // ── TFT Display init ──────────────────────
  tft.init();
  tft.setRotation(1);  // landscape mode
  tft.setSwapBytes(true);
  tft.setTextWrap(false);
  tft.fillScreen(TFT_BLACK);
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("SMART ENERGY", 20, 10);
  tft.drawString("MONITOR", 20, 40);
  tft.setTextSize(1);
  tft.drawString("Initializing...", 20, 80);
  Serial.println("[INIT] TFT Display initialized (SPI)");

  // ── UART2 for PZEM ────────────────────────
  configurePzemSerial(false, 9600);
  Serial.println("[INIT] PZEM UART2 started on RX16/TX17");

  // Quick PZEM baud detection — try common baud rates and report
  auto testPzemBaud = [&]() {
    const int bauds[] = {9600, 2400};
    const bool pinModes[] = {false, true};
    for (uint8_t i = 0; i < sizeof(bauds)/sizeof(bauds[0]); i++) {
      int b = bauds[i];
      for (uint8_t j = 0; j < sizeof(pinModes)/sizeof(pinModes[0]); j++) {
        configurePzemSerial(pinModes[j], b);
        delay(250);
        float tv = pzem.voltage();
        if (!isnan(tv)) {
          Serial.printf("[PZEM-DBG] Detected response at %d baud (%s pins): V=%.1f\n",
                        b, pinModes[j] ? "swapped" : "normal", tv);
          return b;
        }
        Serial.printf("[PZEM-DBG] No response at %d baud (%s pins)\n",
                      b, pinModes[j] ? "swapped" : "normal");
      }
    }
    // Restore default
    configurePzemSerial(false, 9600);
    return 0;
  };

  int detected = testPzemBaud();
  if (detected == 0) Serial.println("[PZEM-DBG] No baud detected — PZEM may be unpowered or wiring swapped");

  // ── UART1 for SIM800L ─────────────────────
  Serial1.begin(9600, SERIAL_8N1, SIM_RX_PIN, SIM_TX_PIN);
  Serial.println("[INIT] SIM800L UART1 started on RX4/TX2");

  // ── Baseline buffer init ──────────────────
  memset(baselineBuffer, 0, sizeof(baselineBuffer));

  // ── WiFi connect ──────────────────────────
  connectWiFi();
  if (WiFi.status() == WL_CONNECTED) {
    if (!firebaseSignInAnonymous()) {
      Serial.println("[FB] Anonymous auth failed — continuing with offline buffering");
    }
  }
  // ── SIM800L handshake ─────────────────────
  simSendAT("AT", 500);
  simSendAT("AT+CMGF=1", 500);   // SMS text mode
  Serial.println("[INIT] SIM800L ready");

  Serial.println("[INIT] Boot complete. Entering main loop.");
  updateTFTDisplay();
  Serial.println("[INIT] TFT display refresh requested after boot");
  Serial.println("=====================================\n");
}

// ════════════════════════════════════════════
//  MAIN LOOP — non-blocking, millis-based
// ════════════════════════════════════════════
void loop() {
  unsigned long now = millis();

  // ── WiFi watchdog ─────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(LED_BLUE_PIN, LOW);
    if (now - lastWifiRetry >= INTERVAL_WIFI_RETRY) {
      Serial.println("[WIFI] Disconnected — retrying...");
      connectWiFi();
      lastWifiRetry = now;
    }
  }
  else {
    // Just became connected — ensure auth and flush buffered data
    if (FB_ID_TOKEN.length() == 0) {
      // Try anonymous sign-in; if it fails we'll fall back to legacy secret
      if (!firebaseSignInAnonymous()) {
        Serial.println("[FB] Anonymous auth failed after reconnect — will use legacy secret if available");
      }
    }
  }

  // ── PZEM read + relay logic ───────────────
  if (now - lastPzemRead >= INTERVAL_PZEM_READ) {
    if (readPZEM()) {
      updateBaseline(live.power);
      runRelayStateMachine();
      setStatusLeds();
      updateTFTDisplay();  // Update TFT display with new data
      plotTelemetry();     // Output Teleplot telemetry for VSCode graphing
    }
    lastPzemRead = now;
  }

  // ── Firebase /live push ───────────────────
  if (now - lastFirebaseLive >= INTERVAL_FIREBASE_LIVE) {
    if (WiFi.status() == WL_CONNECTED && live.valid) {
      pushFirebaseLive();
    }
    lastFirebaseLive = now;
  }

  // ── Firebase /history append ──────────────
  if (now - lastFirebaseLog >= INTERVAL_FIREBASE_LOG) {
    if (WiFi.status() == WL_CONNECTED && live.valid) {
      appendFirebaseHistory();
    }
    lastFirebaseLog = now;
  }

  // ── Poll relay commands from dashboard ────
  if (now - lastCmdPoll >= INTERVAL_CMD_POLL) {
    if (WiFi.status() == WL_CONNECTED) {
      pollRelayCommands();
    }
    lastCmdPoll = now;
  }

        // ── Heartbeat: push device status periodically
        if (now - lastHeartbeat >= INTERVAL_HEARTBEAT) {
          if (WiFi.status() == WL_CONNECTED) pushDeviceStatus();
          lastHeartbeat = now;
        }

  // ── Flush offline buffer if reconnected ───
  // Flush a few buffered history items per loop to avoid network bursts
  if (WiFi.status() == WL_CONNECTED && offlineCount > 0) {
    Serial.printf("[OFFLINE] Flushing %d buffered readings (attempting up to 3)\n", offlineCount);
    uint8_t attempts = 0;
    while (offlineCount > 0 && attempts < 3) {
      uint8_t idx = (offlineHead - offlineCount + OFFLINE_BUFFER_SIZE) % OFFLINE_BUFFER_SIZE;
      bool ok = firebasePost("/history", offlineBuffer[idx]);
      if (ok) {
        // remove oldest buffered item
        offlineCount--;
      } else {
        // stop trying on first failure to avoid tight loop
        break;
      }
      attempts++;
    }
  }
}

// ════════════════════════════════════════════
//  WIFI — connect with retry and timeout
// ════════════════════════════════════════════
void connectWiFi() {
  Serial.printf("[WIFI] Attempting connect to %s\n", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  // Non-blocking: return immediately; loop() will retry after INTERVAL_WIFI_RETRY
  // The WiFi status is checked elsewhere and auth/flush will run once connected.
}

void configurePzemSerial(bool swappedPins, int baud) {
  Serial2.end();

  if (swappedPins) {
    Serial2.begin(baud, SERIAL_8N1, PZEM_TX_PIN, PZEM_RX_PIN);
  } else {
    Serial2.begin(baud, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  }

  pzemUsingSwappedPins = swappedPins;
}

// ════════════════════════════════════════════
//  PZEM READ — with NaN validation
// ════════════════════════════════════════════
bool readPZEM() {
  float v  = pzem.voltage();
  float i  = pzem.current();
  float w  = pzem.power();
  float e  = pzem.energy();
  float pf = pzem.pf();
  float hz = pzem.frequency();

  // PZEM returns NaN on communication failure
  if (isnan(v) || isnan(i) || isnan(w) || isnan(e)) {
    live.valid = false;
    Serial.println("[PZEM] Read failed — NaN received");
    digitalWrite(LED_RED_PIN, HIGH);
    return false;
  }

  // Sanity range check (230V ± 30%, 0–100A)
  if (v < 80.0f || v > 280.0f) {
    live.valid = false;
    Serial.printf("[PZEM] Voltage out of range: %.1fV\n", v);
    return false;
  }

  live.voltage     = v;
  live.current     = i;
  live.power       = w;
  live.energy      = e;
  live.powerFactor = isnan(pf) ? 1.0f : pf;
  live.frequency   = isnan(hz) ? 50.0f : hz;
  live.valid       = true;
  live.label       = classifyLoad(w);

  Serial.printf("[PZEM] V:%.1f I:%.2f W:%.1f kWh:%.3f PF:%.2f Hz:%.1f | %s\n",
                v, i, w, e, live.powerFactor, live.frequency, live.label.c_str());

  return true;
}

// ════════════════════════════════════════════
//  LOAD CLASSIFICATION — rule-based engine
//  Context-aware: uses baseline ratio + value
// ════════════════════════════════════════════
String classifyLoad(float watts) {
  live.labelColor = "green";

  if (watts < 10.0f)
    return "Standby";

  if (watts < 100.0f)
    return "Idle";

  if (watts < 500.0f)
    return "Normal usage";

  if (watts < 1000.0f) {
    live.labelColor = "amber";
    return "Moderate load";
  }

  if (watts < 1500.0f) {
    live.labelColor = "amber";
    return "Heavy load active";
  }

  if (watts < 2000.0f) {
    live.labelColor = "red";
    return "High consumption";
  }

  // Above 2000W — check if it's a spike vs sustained
  if (baselineFull && baselineMean > 10.0f) {
    float ratio = watts / baselineMean;
    if (ratio > 3.0f) {
      live.labelColor = "red";
      return "Spike detected";
    }
  }

  live.labelColor = "red";
  return "Critical threshold";
}

// ════════════════════════════════════════════
//  BASELINE + Z-SCORE ANOMALY DETECTION
// ════════════════════════════════════════════
void updateBaseline(float watts) {
  // Rolling circular buffer
  baselineBuffer[baselineIndex] = watts;
  baselineIndex = (baselineIndex + 1) % BASELINE_SAMPLES;
  if (baselineIndex == 0) baselineFull = true;

  uint8_t count = baselineFull ? BASELINE_SAMPLES : baselineIndex;
  if (count < 5) return;   // need at least 5 samples

  // Compute mean
  float sum = 0;
  for (uint8_t i = 0; i < count; i++) sum += baselineBuffer[i];
  baselineMean = sum / count;

  // Compute standard deviation
  float variance = 0;
  for (uint8_t i = 0; i < count; i++) {
    float diff = baselineBuffer[i] - baselineMean;
    variance += diff * diff;
  }
  baselineStdDev = sqrt(variance / count);

  // Z-score for current reading
  if (baselineStdDev < 1.0f) {
    anomalyZScore  = 0.0f;
    anomalyActive  = false;
    return;
  }

  anomalyZScore = fabs((watts - baselineMean) / baselineStdDev);
  bool wasActive = anomalyActive;
  anomalyActive  = (anomalyZScore > ANOMALY_ZSCORE);

  // New anomaly detected — send SMS alert once per cooldown period
  if (anomalyActive && !wasActive) {
    Serial.printf("[ANOMALY] Z=%.2f > %.1f threshold. W=%.1f Mean=%.1f\n",
                  anomalyZScore, ANOMALY_ZSCORE, watts, baselineMean);
    digitalWrite(LED_RED_PIN, HIGH);

    unsigned long now = millis();
    if (now - lastSmsSent >= SMS_COOLDOWN_MS) {
      String msg = "ALERT: Smart Energy Monitor\n";
      msg += "Anomaly detected!\n";
      msg += "Power: " + String(watts, 1) + "W\n";
      msg += "Z-score: " + String(anomalyZScore, 2) + "\n";
      msg += "Status: " + live.label;
      sendSmsAlert(msg);
      lastSmsSent = now;
    }
  }

  if (!anomalyActive) {
    digitalWrite(LED_RED_PIN, LOW);
  }
}

// ════════════════════════════════════════════
//  RELAY STATE MACHINE
//  Rules:
//    1. Must exceed threshold for CONFIRM_HOLD_MS before tripping
//    2. Trip in priority order — lower number trips first
//    3. After trip: COOLDOWN_MS before re-arm
//    4. Zone 3 (Sockets) excluded from auto-trip
//    5. Manual override always respected
// ════════════════════════════════════════════
void runRelayStateMachine() {
  if (!live.valid) return;

  unsigned long now = millis();

  for (uint8_t z = 0; z < 4; z++) {
    ZoneState& zone = zones[z];

    // Zone 3 (index 2 = Sockets): never auto-trip
    // Lighting stays on; only manual control
    if (z == 2) continue;

    // Manual override — skip auto logic
    if (zone.manualOverride) continue;

    // Currently in cooldown after a trip
    if (zone.tripped) {
      if (now - zone.cooldownStart >= COOLDOWN_MS) {
        zone.tripped          = false;
        zone.overThreshSince  = 0;
        setZoneRelay(z + 1, true, "COOLDOWN_COMPLETE");
        Serial.printf("[RELAY] Zone %d re-armed after cooldown\n", z + 1);
      }
      continue;   // still in cooldown — skip
    }

    // ── Power above threshold ─────────────────
    if (live.power > THRESHOLD_WATTS) {
      if (zone.overThreshSince == 0)
        zone.overThreshSince = now;

      unsigned long heldMs = now - zone.overThreshSince;

      // Not held long enough yet — show countdown in serial
      if (heldMs < CONFIRM_HOLD_MS) {
        Serial.printf("[RELAY] Zone %d: %.1fW > %.0fW — hold %lus/%lus\n",
                      z + 1, live.power, THRESHOLD_WATTS,
                      heldMs / 1000, CONFIRM_HOLD_MS / 1000);
        continue;
      }

      // Held long enough — check priority:
      // Only trip this zone if all higher-priority zones already tripped
      bool higherPriorityStillOn = false;
      for (uint8_t j = 0; j < z; j++) {
        if (!zones[j].tripped && !zones[j].manualOverride) {
          higherPriorityStillOn = true;
          break;
        }
      }

      if (higherPriorityStillOn) {
        Serial.printf("[RELAY] Zone %d waiting — higher priority zones still on\n", z + 1);
        continue;
      }

      // TRIP THIS ZONE
      setZoneRelay(z + 1, false, "AUTO_THRESHOLD");
      zone.tripped         = true;
      zone.cooldownStart   = now;
      zone.overThreshSince = 0;
      pushEventToFirebase(z + 1, "TRIP", live.power);

    } else {
      // Power dropped below threshold — reset timer
      if (zone.overThreshSince != 0) {
        Serial.printf("[RELAY] Zone %d: power dropped below threshold — timer reset\n", z + 1);
        zone.overThreshSince = 0;
      }
    }
  }
}

// ════════════════════════════════════════════
//  SET ZONE RELAY — single control point
// ════════════════════════════════════════════
void setZoneRelay(uint8_t zone, bool on, const char* reason) {
  uint8_t z = zone - 1;
  if (z >= 4) return;

  // Active LOW: on = HIGH gpio, off = LOW gpio
  digitalWrite(zones[z].pin, on ? HIGH : LOW);
  zones[z].relayOn = on;

  Serial.printf("[RELAY] Zone %d (%s) → %s | Reason: %s\n",
                zone, zones[z].name, on ? "ON" : "OFF", reason);
}

// ════════════════════════════════════════════
//  FIREBASE — PUSH /live  (PUT — overwrites)
// ════════════════════════════════════════════
void pushFirebaseLive() {
  StaticJsonDocument<320> doc;
  doc["ts"]    = millis();
  doc["v"]     = serialized(String(live.voltage,    1));
  doc["i"]     = serialized(String(live.current,    3));
  doc["w"]     = serialized(String(live.power,      1));
  doc["kwh"]   = serialized(String(live.energy,     3));
  doc["pf"]    = serialized(String(live.powerFactor,2));
  doc["hz"]    = serialized(String(live.frequency,  1));
  doc["label"] = live.label;
  doc["color"] = live.labelColor;
  doc["anomaly"]      = anomalyActive;
  doc["anomaly_z"]    = serialized(String(anomalyZScore, 2));
  doc["z1"]    = zones[0].relayOn;
  doc["z2"]    = zones[1].relayOn;
  doc["z3"]    = zones[2].relayOn;
  doc["z4"]    = zones[3].relayOn;

  String body;
  serializeJson(doc, body);

  bool ok = firebasePut("/live", body);
  if (!ok) {
    // Buffer for later flush
    offlineBuffer[offlineHead] = body;
    offlineHead = (offlineHead + 1) % OFFLINE_BUFFER_SIZE;
    if (offlineCount < OFFLINE_BUFFER_SIZE) offlineCount++;
    Serial.println("[FIREBASE] Live push failed — buffered");
  }
}

// ════════════════════════════════════════════
//  FIREBASE — APPEND /history (POST — new key)
// ════════════════════════════════════════════
void appendFirebaseHistory() {
  StaticJsonDocument<320> doc;
  doc["ts"]    = millis();
  doc["v"]     = live.voltage;
  doc["i"]     = live.current;
  doc["w"]     = live.power;
  doc["kwh"]   = live.energy;
  doc["pf"]    = live.powerFactor;
  doc["hz"]    = live.frequency;
  doc["label"] = live.label;
  doc["anomaly"] = anomalyActive;

  String body;
  serializeJson(doc, body);
  firebasePost("/history", body);
}

// ════════════════════════════════════════════
//  FIREBASE — PUSH EVENT  (relay trip/restore)
// ════════════════════════════════════════════
void pushEventToFirebase(uint8_t zone, const char* event, float watts) {
  StaticJsonDocument<128> doc;
  doc["zone"]  = zone;
  doc["name"]  = zones[zone - 1].name;
  doc["event"] = event;
  doc["watts"] = serialized(String(watts, 1));
  doc["ts"]    = millis();

  String body;
  serializeJson(doc, body);
  // Try to post event; if it fails, buffer as a history entry to ensure persistence
  if (!firebasePost("/events", body)) {
    Serial.println("[FIREBASE] Event post failed — buffering as history fallback");
    // Append simple history record so event is not lost
    StaticJsonDocument<128> hdoc;
    hdoc["ts"] = millis();
    hdoc["zone"] = zone;
    hdoc["event"] = event;
    hdoc["watts"] = watts;
    String hbody;
    serializeJson(hdoc, hbody);
    offlineBuffer[offlineHead] = hbody;
    offlineHead = (offlineHead + 1) % OFFLINE_BUFFER_SIZE;
    if (offlineCount < OFFLINE_BUFFER_SIZE) offlineCount++;
  }
}

// ════════════════════════════════════════════
//  FIREBASE — POLL /relay_commands
//  Dashboard writes {z1:bool, z2:bool...}
//  ESP32 checks for changes and acts
// ════════════════════════════════════════════
void pollRelayCommands() {
  String raw = firebaseGet("/relay_commands");
  if (raw.length() < 5) return;

  StaticJsonDocument<128> doc;
  DeserializationError err = deserializeJson(doc, raw);
  if (err) {
    Serial.printf("[CMD] JSON parse error: %s\n", err.c_str());
    return;
  }

  const char* keys[4] = {"z1", "z2", "z3", "z4"};
  for (uint8_t i = 0; i < 4; i++) {
    if (!doc.containsKey(keys[i])) continue;
    bool desired = doc[keys[i]].as<bool>();

    // Only act if the command changed
    if (desired != lastCmdState[i]) {
      zones[i].manualOverride = true;
      zones[i].tripped        = false;   // clear any auto-trip
      zones[i].overThreshSince = 0;
      setZoneRelay(i + 1, desired, "DASHBOARD_CMD");
      lastCmdState[i] = desired;

      // Log the manual command as an event
      pushEventToFirebase(i + 1,
        desired ? "MANUAL_ON" : "MANUAL_OFF",
        live.power);
    }
  }
}

// ════════════════════════════════════════════
//  FIREBASE HTTP HELPERS
// ════════════════════════════════════════════

String firebaseAuthQuery() {
  if (FB_ID_TOKEN.length() > 0) {
    Serial.printf("[FB AUTH QUERY] Using ID token (len=%d) in query\n", FB_ID_TOKEN.length());
    return String("?auth=") + FB_ID_TOKEN;
  }
  if (FB_SECRET_OVERRIDE.length() > 0) {
    Serial.println("[FB AUTH QUERY] Using device token override in query");
    return String("?auth=") + FB_SECRET_OVERRIDE;
  }
  Serial.println("[FB AUTH QUERY] Using legacy secret in query");
  return String("?auth=") + FB_SECRET;
}


bool requestDeviceToken() {
  if (String(TOKEN_EXCHANGE_URL).length() == 0 || String(DEVICE_PROVISION_KEY).length() == 0) return false;

  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = String(TOKEN_EXCHANGE_URL);

  StaticJsonDocument<256> req;
  String mac = WiFi.macAddress();
  req["device_id"] = mac;
  req["ttl"] = 3600;
  String body;
  serializeJson(req, body);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + String(DEVICE_PROVISION_KEY));
  int code = http.POST(body);
  String resp = http.getString();
  http.end();

  if (code != 200) {
    Serial.printf("[TOKEN EXCHANGE] Error %d fetching token: %s\n", code, resp.c_str());
    return false;
  }

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, resp);
  if (err) {
    Serial.printf("[TOKEN EXCHANGE] JSON parse failed: %s\n", err.c_str());
    return false;
  }

  const char* token = doc["token"];
  if (!token) {
    Serial.println("[TOKEN EXCHANGE] No token field in response");
    return false;
  }

  FB_SECRET_OVERRIDE = String(token);
  return true;
}

// ════════════════════════════════════════════
//  DEVICE HEARTBEAT — push basic device health to /device_status
// ════════════════════════════════════════════
void pushDeviceStatus() {
  StaticJsonDocument<256> doc;
  doc["ts"] = millis();
  doc["ip"] = WiFi.localIP().toString();
  doc["uptime_ms"] = millis();
  doc["free_heap"] = ESP.getFreeHeap();
  doc["rssi"] = WiFi.RSSI();
  doc["offline_buffer"] = offlineCount;
  doc["version"] = "v1.0";

  String body;
  serializeJson(doc, body);

  // Use MAC address as device id key
  String mac = WiFi.macAddress();
  String path = String("/device_status/") + mac;
  firebasePut(path, body);
}

bool firebaseSignInAnonymous() {
  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = String(FB_AUTH_ENDPOINT) + FB_API_KEY;

  StaticJsonDocument<128> authDoc;
  authDoc["returnSecureToken"] = true;
  String authBody;
  serializeJson(authDoc, authBody);

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(authBody);
  String response = http.getString();
  http.end();

  if (code != 200) {
    Serial.printf("[FB AUTH] Error %d signing in anonymously | resp=%s\n", code, response.c_str());
    return false;
  }

  StaticJsonDocument<512> respDoc;
  DeserializationError err = deserializeJson(respDoc, response);
  if (err) {
    Serial.printf("[FB AUTH] JSON parse failed: %s\n", err.c_str());
    return false;
  }

  const char* idToken  = respDoc["idToken"];
  const char* expiresIn = respDoc["expiresIn"];
  if (!idToken || !expiresIn) {
    Serial.println("[FB AUTH] Missing idToken or expiresIn in auth response");
    return false;
  }

  FB_ID_TOKEN = String(idToken);
  unsigned long expiresSec = strtoul(expiresIn, NULL, 10);
  FB_TOKEN_EXPIRES_AT = millis() + (expiresSec * 1000UL);
  Serial.printf("[FB AUTH] Anonymous auth succeeded, token valid %lus\n", expiresSec);
  Serial.printf("[FB AUTH] idToken len=%d\n", FB_ID_TOKEN.length());
  // Print a short prefix of the token for verification (not full token)
  Serial.print("[FB AUTH] idToken prefix: ");
  int prefixLen = FB_ID_TOKEN.length() < 40 ? FB_ID_TOKEN.length() : 40;
  Serial.println(FB_ID_TOKEN.substring(0, prefixLen));
  return true;
}

bool ensureFirebaseAuth() {
  // Prefer valid ID token
  if (FB_ID_TOKEN.length() > 0 && millis() + 10000 < FB_TOKEN_EXPIRES_AT) {
    return true;
  }

  // Try to obtain a short-lived device token from the token exchange server
  if (FB_SECRET_OVERRIDE.length() == 0 && String(TOKEN_EXCHANGE_URL).length() > 0 && String(DEVICE_PROVISION_KEY).length() > 0) {
    Serial.println("[FB] Attempting device token exchange...");
    if (requestDeviceToken()) {
      Serial.println("[FB] Device token obtained");
      return true;
    }
    Serial.println("[FB] Device token exchange failed or not available");
  }

  // Fall back to anonymous sign-in (Firebase Auth)
  if (firebaseSignInAnonymous()) {
    return true;
  }

  // Fall back to legacy DB secret if present
  if (String(FB_SECRET).length() > 0) {
    Serial.println("[FB] Using legacy secret fallback");
    return true;
  }

  return false;
}

bool firebasePut(const String& path, const String& jsonBody) {
  if (!ensureFirebaseAuth()) {
    Serial.println("[FB PUT] Auth unavailable, skipping request");
    return false;
  }

  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = FB_URL + path + ".json" + firebaseAuthQuery();
  Serial.printf("[FB PUT] URL=%s\n", url.c_str());
  Serial.printf("[FB PUT] Body=%s\n", jsonBody.c_str());

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.PUT(jsonBody);
  String body = http.getString();
  http.end();

  if (code == 200 || code == 204) return true;
  Serial.printf("[FB PUT] Error %d on %s | resp=%s\n", code, path.c_str(), body.c_str());
  return false;
}

bool firebasePost(const String& path, const String& jsonBody) {
  if (!ensureFirebaseAuth()) {
    Serial.println("[FB POST] Auth unavailable, skipping request");
    return false;
  }

  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = FB_URL + path + ".json" + firebaseAuthQuery();

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  int code = http.POST(jsonBody);
  String body = http.getString();
  http.end();

  if (code == 200 || code == 204) return true;
  Serial.printf("[FB POST] Error %d on %s | resp=%s\n", code, path.c_str(), body.c_str());
  return false;
}

String firebaseGet(const String& path) {
  if (!ensureFirebaseAuth()) {
    Serial.println("[FB GET] Auth unavailable, skipping request");
    return String();
  }

  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = FB_URL + path + ".json" + firebaseAuthQuery();

  http.begin(client, url);
  int code = http.GET();

  String response = "";
  if (code == 200) {
    response = http.getString();
  } else {
    response = http.getString();
    Serial.printf("[FB GET] Error %d on %s | resp=%s\n", code, path.c_str(), response.c_str());
  }
  http.end();
  return response;
}

// ════════════════════════════════════════════
//  SIM800L — SEND SMS ALERT
// ════════════════════════════════════════════
void sendSmsAlert(const String& message) {
  Serial.println("[SMS] Sending alert...");

  // Set text mode
  simSendAT("AT+CMGF=1", 500);

  // Set recipient
  Serial1.print("AT+CMGS=\"");
  Serial1.print(SIM_PHONE_NO);
  Serial1.println("\"");
  delay(500);

  // Send message body + Ctrl+Z to send
  Serial1.print(message);
  delay(100);
  Serial1.write(0x1A);   // Ctrl+Z = send command
  delay(3000);

  // Read response
  String resp = "";
  unsigned long t = millis();
  while (millis() - t < 5000) {
    if (Serial1.available()) resp += (char)Serial1.read();
  }

  if (resp.indexOf("+CMGS") >= 0) {
    Serial.println("[SMS] Sent successfully");
    blinkLed(LED_GREEN_PIN, 5);
  } else {
    Serial.println("[SMS] Send may have failed — response: " + resp);
  }
}

void simSendAT(const String& cmd, uint32_t waitMs) {
  Serial1.println(cmd);
  delay(waitMs);
  while (Serial1.available()) Serial.write(Serial1.read());
}

// ════════════════════════════════════════════
//  LED HELPERS
// ════════════════════════════════════════════
void blinkLed(uint8_t pin, uint8_t times) {
  for (uint8_t i = 0; i < times; i++) {
    digitalWrite(pin, LOW);
    delay(100);
    digitalWrite(pin, HIGH);
    delay(100);
  }
}

void setStatusLeds() {
  // Green: always on when system healthy
  digitalWrite(LED_GREEN_PIN, HIGH);

  // Red: anomaly or fault
  digitalWrite(LED_RED_PIN, (anomalyActive || !live.valid) ? HIGH : LOW);

  // Blue: WiFi status
  digitalWrite(LED_BLUE_PIN, (WiFi.status() == WL_CONNECTED) ? HIGH : LOW);
}

// ════════════════════════════════════════════
//  TFT DISPLAY FUNCTIONS
// ════════════════════════════════════════════

void updateTFTDisplay() {
  static unsigned long lastUpdate = 0;
  unsigned long now = millis();

  // Force the first update immediately after boot,
  // then throttle to one refresh every 2 seconds.
  if (lastUpdate == 0) {
    lastUpdate = now;
    Serial.println("[TFT] First display update");
    drawTFTMetrics();
    return;
  }

  if (now - lastUpdate < 2000) return;
  lastUpdate = now;

  Serial.println("[TFT] Updating display");
  drawTFTMetrics();
}

void drawTFTMetrics() {
#if TFT_VISUAL_TEST
  static bool toggle = false;
  toggle = !toggle;
  uint16_t bg = toggle ? TFT_NAVY : TFT_DARKGREY;
  uint16_t fg = toggle ? TFT_WHITE : TFT_YELLOW;
  tft.fillScreen(bg);
  tft.setTextWrap(false);
  tft.setTextSize(4);
  tft.setTextColor(fg, bg);
  tft.drawString("TFT TEST", 20, 40);
  tft.setTextSize(2);
  unsigned long up = millis() / 1000UL;
  String uptime = String(up) + "s";
  tft.drawString("Uptime: " + uptime, 20, 130);
  tft.setTextSize(1);
  tft.drawString("Build: " + String(__DATE__) + " " + String(__TIME__), 10, 200);
  tft.setTextColor(TFT_LIGHTGREY, bg);
  tft.drawString("V:" + String(live.voltage,1) + " I:" + String(live.current,2), 200, 160);
  tft.drawString("W:" + String((long)live.power), 200, 180);
#else
  // Force a full clear and redraw of all fields
  tft.fillScreen(TFT_BLACK);
  tft.setTextWrap(false);
  
  // Header
  tft.setTextColor(TFT_CYAN, TFT_BLACK);
  tft.setTextSize(2);
  tft.drawString("ENERGY MONITOR", 10, 5);
  
  // WiFi status indicator
  String wifiStatus = WiFi.status() == WL_CONNECTED ? "ONLINE" : "OFFLINE";
  uint16_t wifiColor = WiFi.status() == WL_CONNECTED ? TFT_GREEN : TFT_RED;
  tft.setTextColor(wifiColor, TFT_BLACK);
  tft.drawString(wifiStatus, 240, 5);
  
  // Real-time metrics
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextSize(1);
  int yPos = 45;
  
  auto drawLine = [&](const String &label, const String &value) {
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.drawString(label, 10, yPos);
    tft.setTextColor(TFT_YELLOW, TFT_BLACK);
    tft.drawString(value, 120, yPos);
    yPos += 20;
  };
  
  drawLine("Voltage:", String(live.voltage, 1) + "V");
  drawLine("Current:", String(live.current, 2) + "A");
  drawLine("Power:", String((long)live.power) + "W");
  drawLine("Energy:", String(live.energy, 2) + "kWh");
  drawLine("PF:", String(live.powerFactor, 2));
  drawLine("Freq:", String(live.frequency, 1) + "Hz");
  
  // Load Classification & Anomaly
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.drawString("Load Class:", 10, yPos);
  uint16_t labelColor = TFT_GREEN;
  if (live.labelColor == "amber") labelColor = TFT_ORANGE;
  else if (live.labelColor == "red") labelColor = TFT_RED;
  tft.setTextColor(labelColor, TFT_BLACK);
  tft.drawString(live.label, 120, yPos);
  yPos += 20;
  
  if (anomalyActive) {
    tft.setTextColor(TFT_RED, TFT_BLACK);
    tft.drawString("ANOMALY: Z=" + String(anomalyZScore, 2), 10, yPos);
  }
  
  // Zone Status (bottom)
  yPos = 200;
  tft.setTextSize(1);
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  String zoneStr = "Z1:" + String(zones[0].relayOn ? "ON" : "OFF") +
                   " Z2:" + String(zones[1].relayOn ? "ON" : "OFF") +
                   " Z3:" + String(zones[2].relayOn ? "ON" : "OFF") +
                   " Z4:" + String(zones[3].relayOn ? "ON" : "OFF");
  tft.drawString(zoneStr, 10, yPos);
#endif
}

// ════════════════════════════════════════════
//  TELEPLOT TELEMETRY — for VSCode graphing
// ════════════════════════════════════════════
void plotTelemetry() {
  // Output Teleplot format on serial: >varName:value
  // This allows real-time graphing in VSCode Teleplot extension
  static unsigned long lastTeleplot = 0;
  unsigned long now = millis();
  
  // Send telemetry every 500ms to avoid flooding serial
  if (now - lastTeleplot < 500) return;
  lastTeleplot = now;
  
  Serial.print(">voltage:");
  Serial.println(live.voltage, 1);
  
  Serial.print(">current:");
  Serial.println(live.current, 2);
  
  Serial.print(">power:");
  Serial.println((long)live.power);
  
  Serial.print(">energy:");
  Serial.println(live.energy, 2);
  
  Serial.print(">frequency:");
  Serial.println(live.frequency, 1);
  
  Serial.print(">pf:");
  Serial.println(live.powerFactor, 2);
}
