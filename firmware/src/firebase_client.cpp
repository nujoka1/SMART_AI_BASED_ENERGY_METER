#include "firebase_client.h"

#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"

static bool firebaseReady = false;

static void configureSecureClient(WiFiClientSecure& client) {
#if USE_INSECURE_TLS
  client.setInsecure();
#endif
}

static String makeFirebaseURL(const String& path) {
  String url = "https://";
  url += FB_HOST;

  if (path.startsWith("/")) {
    url += path;
  } else {
    url += "/";
    url += path;
  }

  url += ".json";

  if (strlen(FB_SECRET) > 0) {
    url += "?auth=";
    url += FB_SECRET;
  }

  return url;
}

static bool putJson(const String& path, const String& payload) {
  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = makeFirebaseURL(path);

#if DEBUG_SERIAL
  Serial.print("Firebase PUT: ");
  Serial.println(path);
#endif

  if (!http.begin(client, url)) {
#if DEBUG_SERIAL
    Serial.println("Firebase PUT begin failed");
#endif
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  int code = http.PUT(payload);
  String body = http.getString();

  http.end();

#if DEBUG_SERIAL
  Serial.print("Firebase PUT response: ");
  Serial.println(code);

  if (code < 200 || code >= 300) {
    Serial.print("Firebase PUT error body: ");
    Serial.println(body);
  }
#endif

  return code >= 200 && code < 300;
}

static bool postJson(const String& path, const String& payload) {
  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = makeFirebaseURL(path);

#if DEBUG_SERIAL
  Serial.print("Firebase POST: ");
  Serial.println(path);
#endif

  if (!http.begin(client, url)) {
#if DEBUG_SERIAL
    Serial.println("Firebase POST begin failed");
#endif
    return false;
  }

  http.addHeader("Content-Type", "application/json");

  int code = http.POST(payload);
  String body = http.getString();

  http.end();

#if DEBUG_SERIAL
  Serial.print("Firebase POST response: ");
  Serial.println(code);

  if (code < 200 || code >= 300) {
    Serial.print("Firebase POST error body: ");
    Serial.println(body);
  }
#endif

  return code >= 200 && code < 300;
}

static bool getJson(const String& path, JsonDocument& doc) {
  WiFiClientSecure client;
  configureSecureClient(client);

  HTTPClient http;
  String url = makeFirebaseURL(path);

#if DEBUG_SERIAL
  Serial.print("Firebase GET: ");
  Serial.println(path);
#endif

  if (!http.begin(client, url)) {
#if DEBUG_SERIAL
    Serial.println("Firebase GET begin failed");
#endif
    return false;
  }

  int code = http.GET();
  String body = http.getString();

  http.end();

#if DEBUG_SERIAL
  Serial.print("Firebase GET response: ");
  Serial.println(code);
#endif

  if (code < 200 || code >= 300) {
#if DEBUG_SERIAL
    Serial.print("Firebase GET error body: ");
    Serial.println(body);
#endif
    return false;
  }

  DeserializationError error = deserializeJson(doc, body);

  if (error) {
#if DEBUG_SERIAL
    Serial.print("Firebase JSON parse error: ");
    Serial.println(error.c_str());
#endif
    return false;
  }

  return true;
}

void initFirebaseClient() {
  firebaseReady = true;

#if DEBUG_SERIAL
  Serial.println("Firebase client initialized");
  Serial.print("Firebase host: ");
  Serial.println(FB_HOST);
#endif
}

bool publishLiveReading(
  const EnergyReading& reading,
  const EnergyStatus& status,
  int wifiRssi
) {
  if (!firebaseReady) {
    return false;
  }

  JsonDocument doc;

  doc["device_id"] = DEVICE_ID;
  doc["updated_at_ms"][".sv"] = "timestamp";
  doc["firmware_version"] = FIRMWARE_VERSION;

  doc["voltage_v"] = reading.voltage_v;
  doc["current_a"] = reading.current_a;
  doc["power_w"] = reading.power_w;
  doc["energy_kwh"] = reading.energy_kwh;
  doc["frequency_hz"] = reading.frequency_hz;
  doc["power_factor"] = reading.power_factor;

  doc["valid"] = reading.valid;
  doc["sensor_status"] = reading.sensor_status;

  doc["status"] = status.status;
  doc["power_quality"] = status.power_quality;
  doc["message"] = status.message;

  doc["wifi_rssi"] = wifiRssi;
  doc["uptime_s"] = millis() / 1000;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["ts"] = millis() / 1000;

  String payload;
  doc["device_id"] = DEVICE_ID;
  doc["serial_number"] = METER_SERIAL_NUMBER;
  serializeJson(doc, payload);

  String path = "/live/";
  path += DEVICE_ID;

  return putJson(path, payload);
}

bool publishDeviceStatus(
  bool online,
  const String& ipAddress,
  int wifiRssi,
  const String& sensorStatus
) {
  if (!firebaseReady) {
    return false;
  }

  JsonDocument doc;

  doc["device_id"] = DEVICE_ID;
  doc["updated_at_ms"][".sv"] = "timestamp";
  doc["online"] = online;
  doc["firmware_version"] = FIRMWARE_VERSION;
  doc["ip"] = ipAddress;
  doc["wifi_rssi"] = wifiRssi;
  doc["sensor_status"] = sensorStatus;
  doc["free_heap"] = ESP.getFreeHeap();
  doc["uptime_s"] = millis() / 1000;
  doc["last_seen"] = millis() / 1000;

  String payload;
  doc["device_id"] = DEVICE_ID;
  doc["serial_number"] = METER_SERIAL_NUMBER;
  serializeJson(doc, payload);

  String path = "/device_status/";
  path += DEVICE_ID;

  return putJson(path, payload);
}

bool publishHistoryReading(const EnergyReading& reading) {
  if (!firebaseReady || !reading.valid) {
    return false;
  }

  JsonDocument doc;

  doc["device_id"] = DEVICE_ID;
  doc["updated_at_ms"][".sv"] = "timestamp";
  doc["voltage_v"] = reading.voltage_v;
  doc["current_a"] = reading.current_a;
  doc["power_w"] = reading.power_w;
  doc["energy_kwh"] = reading.energy_kwh;
  doc["frequency_hz"] = reading.frequency_hz;
  doc["power_factor"] = reading.power_factor;
  doc["sensor_status"] = reading.sensor_status;
  doc["uptime_s"] = millis() / 1000;
  doc["ts"] = millis() / 1000;

  String payload;
  doc["device_id"] = DEVICE_ID;
  doc["serial_number"] = METER_SERIAL_NUMBER;
  serializeJson(doc, payload);

  String path = "/history/";
  path += DEVICE_ID;

  return postJson(path, payload);
}

bool publishAlert(
  const String& level,
  const String& type,
  const String& source,
  const String& message,
  float value,
  float threshold
) {
  if (!firebaseReady) {
    return false;
  }

  JsonDocument doc;

  doc["device_id"] = DEVICE_ID;
  doc["updated_at_ms"][".sv"] = "timestamp";
  doc["level"] = level;
  doc["type"] = type;
  doc["source"] = source;
  doc["message"] = message;
  doc["value"] = value;
  doc["threshold"] = threshold;
  doc["acknowledged"] = false;
  doc["uptime_s"] = millis() / 1000;
  doc["ts"] = millis() / 1000;

  String payload;
  doc["device_id"] = DEVICE_ID;
  doc["serial_number"] = METER_SERIAL_NUMBER;
  serializeJson(doc, payload);

  String path = "/alerts/";
  path += DEVICE_ID;

  return postJson(path, payload);
}

bool fetchAiPrediction(AiPrediction& prediction) {
  JsonDocument doc;

  String path = "/ai_predictions/";
  path += DEVICE_ID;

  if (!getJson(path, doc)) {
    prediction.valid = false;
    return false;
  }

  prediction.valid = true;

  prediction.risk_level = doc["risk_level"] | "unknown";
  prediction.anomaly_score = doc["anomaly_score"] | 0.0;

  JsonObject primary = doc["primary_event"].as<JsonObject>();

  if (!primary.isNull()) {
    prediction.primary_level = primary["level"] | "info";
    prediction.primary_type = primary["type"] | "normal";
    prediction.primary_message = primary["message"] | "No AI event.";
  }

  prediction.recommendation = doc["recommendation"] | "No recommendation yet.";

  prediction.average_power_w = doc["average_power_w"] | 0.0;
  prediction.peak_power_w = doc["peak_power_w"] | 0.0;

  prediction.forecast_daily_kwh = doc["forecast_daily_kwh"] | 0.0;
  prediction.forecast_weekly_kwh = doc["forecast_weekly_kwh"] | 0.0;
  prediction.forecast_monthly_kwh = doc["forecast_monthly_kwh"] | 0.0;
  prediction.forecast_yearly_kwh = doc["forecast_yearly_kwh"] | 0.0;

  prediction.prepaid_units_kwh = doc["prepaid_units_kwh"] | 0.0;
  prediction.remaining_prepaid_units_kwh = doc["remaining_prepaid_units_kwh"] | 0.0;
  prediction.estimated_days_remaining = doc["estimated_days_remaining"] | 0.0;

  prediction.updated_at = doc["updated_at"] | 0;

  return true;
}

bool fetchConsumptionSummary(
  const String& period,
  ConsumptionSummary& summary
) {
  JsonDocument doc;

  String path = "/";
  path += period;
  path += "_summary/";
  path += DEVICE_ID;

  if (!getJson(path, doc)) {
    summary.valid = false;
    return false;
  }

  summary.valid = true;
  summary.period = doc["period"] | period;

  summary.kwh_used = doc["kwh_used"] | 0.0;
  summary.estimated_cost = doc["estimated_cost"] | 0.0;
  summary.tariff_per_kwh = doc["tariff_per_kwh"] | 0.0;

  summary.average_power_w = doc["average_power_w"] | 0.0;
  summary.peak_power_w = doc["peak_power_w"] | 0.0;
  summary.average_voltage_v = doc["average_voltage_v"] | 0.0;

  summary.prepaid_units_kwh = doc["prepaid_units_kwh"] | 0.0;
  summary.remaining_prepaid_units_kwh = doc["remaining_prepaid_units_kwh"] | 0.0;

  summary.sample_count = doc["sample_count"] | 0;
  summary.updated_at = doc["updated_at"] | 0;

  return true;
}
