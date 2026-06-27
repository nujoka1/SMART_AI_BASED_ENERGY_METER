#include <Arduino.h>

#include "config.h"
#include "pins.h"

#include "wifi_manager.h"
#include "pzem_reader.h"
#include "tft_display.h"
#include "energy_analyzer.h"
#include "firebase_client.h"

static unsigned long lastReadTime = 0;
static unsigned long lastLiveUploadTime = 0;
static unsigned long lastHistoryUploadTime = 0;
static unsigned long lastHeartbeatTime = 0;
static unsigned long lastAlertTime = 0;

static const unsigned long READ_INTERVAL_MS = 2000;
static const unsigned long ALERT_COOLDOWN_MS = 30000;

static EnergyReading lastReading;
static EnergyStatus lastStatus;

static void initStatusLeds() {
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(LED_BLUE_PIN, OUTPUT);

  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, LOW);
  digitalWrite(LED_BLUE_PIN, LOW);
}

static void updateStatusLeds(const EnergyStatus& status, bool wifiConnected) {
  digitalWrite(LED_BLUE_PIN, wifiConnected ? HIGH : LOW);

  if (status.status == "ok") {
    digitalWrite(LED_GREEN_PIN, HIGH);
    digitalWrite(LED_RED_PIN, LOW);
    return;
  }

  digitalWrite(LED_GREEN_PIN, LOW);
  digitalWrite(LED_RED_PIN, HIGH);
}

static void printReadingToSerial(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected
) {
#if DEBUG_SERIAL
  Serial.println();
  Serial.println("========== SMART ENERGY READING ==========");

  if (!reading.valid) {
    Serial.println("Sensor: reading_error");
  } else {
    Serial.print("Voltage: ");
    Serial.print(reading.voltage_v, 1);
    Serial.println(" V");

    Serial.print("Current: ");
    Serial.print(reading.current_a, 3);
    Serial.println(" A");

    Serial.print("Power: ");
    Serial.print(reading.power_w, 1);
    Serial.println(" W");

    Serial.print("Energy: ");
    Serial.print(reading.energy_kwh, 3);
    Serial.println(" kWh");

    Serial.print("Frequency: ");
    Serial.print(reading.frequency_hz, 1);
    Serial.println(" Hz");

    Serial.print("Power Factor: ");
    Serial.println(reading.power_factor, 2);
  }

  Serial.print("Status: ");
  Serial.println(status.status);

  Serial.print("Power Quality: ");
  Serial.println(status.power_quality);

  Serial.print("Message: ");
  Serial.println(status.message);

  Serial.print("WiFi: ");
  Serial.println(wifiConnected ? "online" : "offline");

  if (wifiConnected) {
    Serial.print("IP: ");
    Serial.println(getWifiIp());

    Serial.print("RSSI: ");
    Serial.println(getWifiRssi());
  }

  Serial.println("==========================================");
#endif
}

static void maybePublishAlert(const EnergyReading& reading, const EnergyStatus& status) {
  if (status.status == "ok") {
    return;
  }

  unsigned long now = millis();

  if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
    return;
  }

  lastAlertTime = now;

  String level = status.status == "critical" ? "critical" : "warning";
  float value = 0.0;
  float threshold = 0.0;

  if (status.power_quality == "undervoltage") {
    value = reading.voltage_v;
    threshold = VOLTAGE_MIN_SAFE;
  } else if (status.power_quality == "overvoltage") {
    value = reading.voltage_v;
    threshold = VOLTAGE_MAX_SAFE;
  } else if (status.power_quality == "overcurrent") {
    value = reading.current_a;
    threshold = CURRENT_MAX_SAFE;
  } else if (status.power_quality == "overload") {
    value = reading.power_w;
    threshold = POWER_MAX_SAFE;
  } else if (status.power_quality == "poor_power_factor") {
    value = reading.power_factor;
    threshold = POWER_FACTOR_MIN_SAFE;
  }

  publishAlert(
    level,
    status.power_quality,
    "firmware",
    status.message,
    value,
    threshold
  );
}

void setup() {
#if DEBUG_SERIAL
  Serial.begin(115200);
  delay(300);
  Serial.println();
  Serial.println("Smart AI-Based Energy Meter starting...");
#endif

  initStatusLeds();

  initTftDisplay();
  showBootScreen();

  initPzemReader();
  initWifiManager();
  initFirebaseClient();

#if DEBUG_SERIAL
  Serial.println("Setup complete.");
#endif
}

void loop() {
  updateWifiManager();

  unsigned long now = millis();

  if (now - lastReadTime >= READ_INTERVAL_MS) {
    lastReadTime = now;

    lastReading = readEnergyData();
    lastStatus = analyzeEnergyReading(lastReading);

    bool wifiConnected = isWifiConnected();

    updateStatusLeds(lastStatus, wifiConnected);

    showEnergyScreen(
      lastReading,
      lastStatus,
      wifiConnected,
      getWifiIp()
    );

    printReadingToSerial(lastReading, lastStatus, wifiConnected);
  }

  if (isWifiConnected() && now - lastLiveUploadTime >= LIVE_UPLOAD_INTERVAL_MS) {
    lastLiveUploadTime = now;

    publishLiveReading(
      lastReading,
      lastStatus,
      getWifiRssi()
    );
  }

  if (isWifiConnected() && now - lastHeartbeatTime >= HEARTBEAT_INTERVAL_MS) {
    lastHeartbeatTime = now;

    publishDeviceStatus(
      true,
      getWifiIp(),
      getWifiRssi(),
      lastReading.sensor_status
    );
  }

  if (isWifiConnected() && now - lastHistoryUploadTime >= HISTORY_UPLOAD_INTERVAL_MS) {
    lastHistoryUploadTime = now;
    publishHistoryReading(lastReading);
  }

  if (isWifiConnected()) {
    maybePublishAlert(lastReading, lastStatus);
  }
}
