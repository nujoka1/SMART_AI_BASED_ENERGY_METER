/* Archived duplicate: smart_energy_monitor_v2.ino
   This file was moved to backups/sketches during canonicalization.
   Keep it for reference; the canonical sketch is `smart_energy_monitor.ino`.
*/

/* Original content follows */

/*
   Smart Energy Monitor - Arduino IDE Sketch (SIMPLIFIED HTTP VERSION)
   ESP32 with 4-zone relay control, TFT display, PZEM sensor, Firebase integration
  
   Uses direct HTTP requests instead of complex Firebase library
  
   Hardware:
   - ESP32-D0WD-V3
   - 4x Relay modules (GPIO 26, 27, 14, 12) - Active LOW
   - TFT Display (SPI)
   - PZEM-004T energy meter (UART2)
   - WiFi to Firebase
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>
#include <SPI.h>
#include <TFT_eSPI.h>
#include <ArduinoJson.h>

// Use build-time firmware secrets. Copy `firmware/config.h` from template and
// provide real values; keep that file out of version control.
#include "firmware/config.h"

// Firebase and WiFi configuration are provided at build time via
// `firmware/config.h` (see firmware/config.h.template). We map legacy
// macro names below for compatibility with older sketches.

#ifndef FIREBASE_HOST
#define FIREBASE_HOST FB_HOST
#endif
#ifndef FIREBASE_AUTH
#define FIREBASE_AUTH FB_SECRET
#endif

// ==================== GPIO PIN DEFINITIONS ====================
#define RELAY1_PIN 26
#define RELAY2_PIN 27
#define RELAY3_PIN 14
#define RELAY4_PIN 12

#define LED_GREEN 32
#define LED_RED 33
#define LED_BLUE 13

// UART2 for PZEM sensor (TX=GPIO17, RX=GPIO16)
#define PZEM_RX 16
#define PZEM_TX 17

// ==================== TFT DISPLAY ====================
TFT_eSPI tft = TFT_eSPI();
HardwareSerial pzemSerial(2);
HTTPClient http;

// Short-lived device token override (fetched from token-exchange service)
String FB_SECRET_OVERRIDE = "";

// ... (archived content truncated for brevity) ...

