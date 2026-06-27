#ifndef FIRMWARE_CONFIG_EXAMPLE_H
#define FIRMWARE_CONFIG_EXAMPLE_H

/*
  Smart AI-Based Energy Meter
  Copy this file to config.h and fill in your real values.

  Never commit real WiFi passwords, Firebase secrets, or private credentials.
*/

// WiFi
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// Firebase Realtime Database
// Do not include https://
// Do not include trailing slash
#define FB_HOST "your-project-default-rtdb.region.firebasedatabase.app"

// For testing only. Leave empty if database rules are open during development.
// Replace later with safer authentication.
#define FB_SECRET ""

// Device
#define DEVICE_ID "esp32_energy_meter_01"
#define FIRMWARE_VERSION "1.0.0"

// TLS
// true for development. Production should use proper root CA validation.
#define USE_INSECURE_TLS true

// Debug
#define DEBUG_SERIAL true

// Safety thresholds
#define VOLTAGE_MIN_SAFE 180.0
#define VOLTAGE_MAX_SAFE 250.0
#define CURRENT_MAX_SAFE 10.0
#define POWER_MAX_SAFE 2200.0
#define POWER_FACTOR_MIN_SAFE 0.75

// Upload intervals
#define LIVE_UPLOAD_INTERVAL_MS 5000
#define HISTORY_UPLOAD_INTERVAL_MS 30000
#define HEARTBEAT_INTERVAL_MS 10000
#define SETTINGS_FETCH_INTERVAL_MS 30000
#define AI_FETCH_INTERVAL_MS 10000

#endif
