#ifndef SMART_ENERGY_PINS_H
#define SMART_ENERGY_PINS_H

/*
  Smart AI-Based Energy Meter pin map.

  Confirmed working:
  PZEM UART:
    ESP32 RX = GPIO16
    ESP32 TX = GPIO17

  Status LEDs:
    Green  = GPIO32
    Red    = GPIO33
    Yellow = GPIO13

  TFT pins are handled separately in:
    tft/TFT_USER_SETUP.h
*/

// PZEM-004T v3.0 UART
#define PZEM_RX_PIN 16
#define PZEM_TX_PIN 17

// Status LEDs
#define LED_GREEN_PIN  32
#define LED_RED_PIN    33
#define LED_YELLOW_PIN 13

// Alarm buzzer
// GPIO27 was previously relay zone 2.
// Since relay is removed in this new design, GPIO27 is available.
// Change this only if your buzzer is physically connected elsewhere.
#define BUZZER_PIN 27

#endif
