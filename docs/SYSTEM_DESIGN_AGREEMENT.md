# Smart AI-Based Energy Meter System Design Agreement

## Project Name

Smart AI-Based Energy Meter

## Purpose

This document records the agreed design direction for the Smart AI-Based Energy Meter project.

The system is designed as a modern smart energy monitoring product using:

* ESP32 firmware
* PZEM-004T v3.0 energy sensor
* ILI9488 TFT display
* Firebase Realtime Database
* Web dashboard
* Android mobile application
* AI analytics engine
* Local LED and buzzer alarm system

The goal is not just to display voltage and current, but to build a complete smart meter ecosystem that can monitor, store, analyze, alert, visualize, and recommend energy usage decisions.

## Current Confirmed Working Status

The following hardware and software functions are already confirmed working:

* ESP32 firmware builds and uploads successfully.
* PZEM-004T reads real voltage, current, power, energy, frequency, and power factor.
* WiFi connects successfully to the configured network.
* Firebase Realtime Database receives live meter data.
* Firebase receives history records.
* Firebase receives device status records.
* Firebase receives alert records.
* TFT display now works using the correct ILI9488 configuration.
* Serial monitor output corresponds with the TFT readings.

## Confirmed Hardware Configuration

### PZEM-004T v3.0

```text
ESP32 RX = GPIO16
ESP32 TX = GPIO17
Baudrate = 9600
```

### TFT Display

The working display is not ILI9341. It is ILI9488.

```text
Driver = ILI9488
MISO   = GPIO19
MOSI   = GPIO23
SCLK   = GPIO18
CS     = GPIO15
DC     = GPIO2
RST    = GPIO4
SPI    = 27000000
```

### Status LEDs

From previous verified firmware:

```text
Green LED  = GPIO32
Red LED    = GPIO33
Yellow LED = GPIO13
```

### Buzzer

The buzzer will be added as a local alarm output.

Default proposed pin:

```text
Buzzer = GPIO27
```

If the physical wiring differs, only the buzzer pin definition should be changed.

## What We Are Reusing From Old Files

We are not copying the old project blindly.

We are only reusing verified working hardware and configuration facts:

* WiFi SSID and password
* Firebase project host and development secret
* PZEM RX and TX pins
* TFT driver and pin configuration
* LED pin configuration

## What We Are Not Reusing From Old Files

The new design will not carry over the old messy architecture.

The following old features are rejected for this build:

* Relay switching
* Zone-based relay control
* `/relay_commands`
* SIM800L SMS logic
* Old mixed MicroPython firmware
* Old flat Firebase structure
* Token-exchange confusion
* Fake AI labels without real analytics

This project is now a smart meter and analytics system, not a relay-switching system.

## Final Product Direction

The system will work as one integrated product across three interfaces:

1. TFT local display
2. Web dashboard
3. Android mobile application

All three will use the same Firebase data contract and show the same system state.

## Firebase Data Structure

The official Firebase Realtime Database structure is:

```text
/live/{deviceId}
/history/{deviceId}
/device_status/{deviceId}
/alerts/{deviceId}
/ai_predictions/{deviceId}
/settings/{deviceId}
/daily_summary/{deviceId}
/weekly_summary/{deviceId}
/monthly_summary/{deviceId}
/yearly_summary/{deviceId}
/system_logs/{deviceId}
```

No module should create random Firebase paths.

## ESP32 Firmware Responsibilities

The ESP32 firmware will handle:

* Reading PZEM values
* Displaying readings on TFT
* Uploading live readings to Firebase
* Uploading periodic history records
* Uploading device status
* Uploading firmware-generated alerts
* Managing LEDs
* Managing buzzer alarm
* Detecting immediate safety problems
* Showing rotating TFT pages
* Reading settings from Firebase later

The ESP32 will not perform heavy AI training. It will only perform fast local safety analysis.

## Firmware Safety Layer

The firmware will immediately detect:

* Overvoltage
* Undervoltage
* Overcurrent
* Overload
* Sensor error
* Very poor power factor
* WiFi offline
* Firebase upload failure

The firmware safety layer will control:

* TFT warning screen
* LED indication
* Buzzer alarm
* Firebase alert creation

## LED and Buzzer Agreement

### Boot State

```text
Green -> Yellow -> Red quick blink pattern
```

### Normal State

```text
Green ON
Yellow OFF
Red OFF
Buzzer OFF
```

### Warning State

```text
Yellow ON
Short buzzer chirp at intervals
```

### Critical State

```text
Red ON
Fast buzzer beep pattern
```

### Sensor Error State

```text
Red blinking
Buzzer pulse
```

### WiFi Offline State

```text
Yellow ON
Buzzer OFF
```

## TFT Display Agreement

The TFT should not remain on only one fixed page.

The TFT will behave like a small local dashboard with rotating pages.

Each page will display for a fixed time, then automatically rotate to the next page.

Suggested rotation time:

```text
5 to 7 seconds per page
```

## TFT Page 1: Live Meter Overview

This page shows the main real-time electrical values:

* Voltage
* Current
* Power
* Energy
* Frequency
* Power factor
* WiFi state
* System status

This is the main page for quick inspection.

## TFT Page 2: Live Trend Graph

This page shows a scrolling live graph using recent ESP32 memory buffer values.

Possible graph lines:

* Voltage trend
* Current trend
* Power trend

The ESP32 will keep a short buffer of recent readings.

Recommended buffer:

```text
60 readings
1 reading every 2 seconds
About 2 minutes of local trend
```

## TFT Page 3: AC Wave Visualization

The PZEM does not provide real oscilloscope waveform samples.

Therefore, the TFT will show an animated sinewave visualization, not a true sampled AC waveform.

The page will display:

* Animated sinewave representation
* Voltage RMS
* Frequency
* Power factor

This will be labelled properly as:

```text
AC waveform visualization
```

If true waveform capture is required later, the system will need an isolated sampling circuit such as ZMPT101B or SCT-013 with ADC sampling.

## TFT Page 4: Power Quality Page

This page will show:

* Voltage quality
* Frequency quality
* Power factor quality
* Load condition
* Risk level
* Safety status

Example:

```text
Voltage: Stable
Frequency: Normal
Power Factor: Poor
Risk: Warning
```

## TFT Page 5: Consumption Summary

This page will show summarized consumption data:

* Today kWh
* This week kWh
* This month kWh
* Estimated bill
* Remaining prepaid units

The ESP32 should not calculate yearly history from raw data.

The AI engine will calculate summaries and write compact values to Firebase.

The ESP32 will later fetch these compact summaries.

## TFT Page 6: AI Recommendation Page

This page will show:

* AI risk level
* Anomaly score
* Forecast daily kWh
* Forecast monthly kWh
* Recommendation text

Example:

```text
AI Risk: Medium
PF low under light load.
Monitor under higher load.
```

## TFT Page 7: Device Health Page

This page will show:

* Sensor status
* WiFi RSSI
* Firebase status
* Free heap
* Uptime
* Firmware version
* Last upload status

This page makes the local device feel like a production-grade product.

## AI Engine Agreement

The AI engine will run outside the ESP32, inside the `ai-engine` folder.

It will study Firebase history data from:

```text
/history/{deviceId}
```

It will write intelligent outputs to:

```text
/ai_predictions/{deviceId}
/alerts/{deviceId}
/daily_summary/{deviceId}
/weekly_summary/{deviceId}
/monthly_summary/{deviceId}
/yearly_summary/{deviceId}
```

## AI Engine Responsibilities

The AI engine will perform:

* Historical voltage analysis
* Historical current analysis
* Historical power analysis
* Energy consumption prediction
* Daily, weekly, monthly, and yearly summaries
* Anomaly detection
* Abnormal usage detection
* Flatline sensor detection
* Sudden power jump detection
* Estimated billing
* Prepaid unit tracking
* AI recommendation generation

## AI Logic Direction

The AI will compare live and historical data against two types of limits:

1. Fixed engineering thresholds
2. Learned historical baseline

This allows the system to detect both dangerous electrical faults and unusual consumption behavior.

## Dashboard Agreement

The web dashboard will be the full professional monitoring interface.

It will include:

* Live metric cards
* Energy trend charts
* Voltage chart
* Current chart
* Power chart
* Power factor quality card
* Daily usage
* Weekly usage
* Monthly usage
* Yearly usage
* Estimated bill
* Remaining prepaid units
* Alerts table
* AI recommendation panel
* Device health card
* Firebase connection status
* Settings page
* Export report feature

The dashboard must not show fake values.

All dashboard data must come from Firebase.

## Android App Agreement

The Android app will provide a mobile version of the smart meter.

It will include:

* Live readings
* Device online/offline status
* Alert notifications
* AI recommendation
* Daily usage
* Prepaid balance
* Simple history chart
* System health status

The Android app and web dashboard must use the same Firebase paths.

## Casing Agreement

The physical casing should support a professional product presentation.

It should include:

* Visible TFT window
* LED labels
* Buzzer sound hole
* ESP32 ventilation
* USB access for firmware upload
* AC input/output safety labeling
* Cable glands for mains wires
* Internal standoffs
* PZEM safety separation
* Warning label for AC mains hazard

## Implementation Roadmap

The agreed implementation order is:

1. Finish LED and buzzer alarm manager.
2. Add TFT rotating page system.
3. Add live graph buffer on ESP32.
4. Add Firebase settings fetch.
5. Build AI engine that studies `/history`.
6. Write AI predictions and summaries to Firebase.
7. Build professional web dashboard.
8. Build Android mobile app.
9. Finalize casing design.

## Design Principle

The project must remain professional and realistic.

No fake AI.
No fake dashboard values.
No random Firebase paths.
No unnecessary relay logic.
No old mixed firmware architecture.

The final system should behave like a real smart energy product.

