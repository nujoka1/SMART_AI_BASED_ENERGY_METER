#include "wifi_manager.h"

#include <WiFi.h>
#include "config.h"

static unsigned long lastWifiAttempt = 0;
static const unsigned long WIFI_RETRY_INTERVAL_MS = 10000;

void initWifiManager() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

#if DEBUG_SERIAL
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
#endif
}

void updateWifiManager() {
  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  unsigned long now = millis();

  if (now - lastWifiAttempt >= WIFI_RETRY_INTERVAL_MS) {
    lastWifiAttempt = now;

#if DEBUG_SERIAL
    Serial.println("WiFi disconnected. Reconnecting...");
#endif

    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
}

bool isWifiConnected() {
  return WiFi.status() == WL_CONNECTED;
}

String getWifiIp() {
  if (!isWifiConnected()) {
    return "0.0.0.0";
  }

  return WiFi.localIP().toString();
}

int getWifiRssi() {
  if (!isWifiConnected()) {
    return -100;
  }

  return WiFi.RSSI();
}
