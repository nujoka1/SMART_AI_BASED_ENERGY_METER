# Firebase Data Contract

## Project

Smart AI-Based Energy Meter

## Purpose

This document defines the official Firebase Realtime Database structure used by the ESP32 firmware, TFT display, web dashboard, Android application, and AI analytics engine.

All modules must follow this same structure. No module should create random paths or use different field names.

## System Modules

The system contains the following modules:

```text
ESP32 firmware
PZEM-004T energy sensor
TFT display
Firebase Realtime Database
Web dashboard
Android application
AI analytics engine
```

The ESP32 is the main hardware device. It reads electrical data from the PZEM sensor, displays the values on the TFT screen, and uploads live readings to Firebase.

The dashboard, Android app, and AI engine read from Firebase.

The AI engine writes predictions, alerts, and recommendations back to Firebase.

## Device ID

The default device ID is:

```text
esp32_energy_meter_01
```

Every device-specific path must use this device ID.

Example:

```text
/live/esp32_energy_meter_01
/history/esp32_energy_meter_01
/device_status/esp32_energy_meter_01
/alerts/esp32_energy_meter_01
/ai_predictions/esp32_energy_meter_01
/settings/esp32_energy_meter_01
```

## Timestamp Standard

All timestamps must use Unix time in milliseconds.

Example:

```json
"ts": 1710000000000
```

The ESP32 may send uptime in seconds separately:

```json
"uptime_s": 340
```

## Measurement Units

Use these units across the whole system:

```text
voltage_v        volts
current_a        amperes
power_w          watts
energy_kwh       kilowatt-hour
frequency_hz     hertz
power_factor     unitless value from 0.0 to 1.0
temperature_c    degrees Celsius if added later
wifi_rssi        dBm
uptime_s         seconds
```

## Main Firebase Paths

The official paths are:

```text
/live
/history
/device_status
/alerts
/ai_predictions
/settings
/daily_summary
/monthly_summary
/system_logs
```

Do not use relay paths in this version.

The following paths are not part of this build:

```text
/relay_commands
/control
/zone1
/zone2
/zone3
/zone4
```

This project is now a smart monitoring meter, not a relay switching system.

## /live

Path:

```text
/live/{deviceId}
```

Purpose:

Stores the latest real-time measurement from the ESP32.

Written by:

```text
ESP32 firmware
```

Read by:

```text
TFT display
Web dashboard
Android app
AI engine
```

Example:

```json
{
  "live": {
    "esp32_energy_meter_01": {
      "voltage_v": 230.4,
      "current_a": 1.25,
      "power_w": 287.5,
      "energy_kwh": 0.82,
      "frequency_hz": 50.0,
      "power_factor": 0.91,
      "wifi_rssi": -61,
      "uptime_s": 340,
      "status": "ok",
      "sensor_status": "connected",
      "power_quality": "normal",
      "ts": 1710000000000
    }
  }
}
```

Field description:

```text
voltage_v         measured AC voltage
current_a         measured AC current
power_w           measured active power
energy_kwh        accumulated energy consumption
frequency_hz      measured AC frequency
power_factor      measured power factor
wifi_rssi         ESP32 WiFi signal strength
uptime_s          ESP32 uptime in seconds
status            general device status
sensor_status     PZEM sensor state
power_quality     normal, warning, or critical
ts                timestamp in milliseconds
```

Allowed status values:

```text
ok
warning
critical
offline
sensor_error
wifi_error
```

Allowed sensor_status values:

```text
connected
disconnected
reading_error
unknown
```

Allowed power_quality values:

```text
normal
undervoltage
overvoltage
overcurrent
overload
poor_power_factor
unstable
```

## /history

Path:

```text
/history/{deviceId}/{recordId}
```

Purpose:

Stores periodic historical readings for charts, analytics, reports, and AI prediction.

Written by:

```text
ESP32 firmware
```

Read by:

```text
Web dashboard
Android app
AI engine
```

Write interval:

```text
Every 30 seconds or every 60 seconds
```

Example:

```json
{
  "history": {
    "esp32_energy_meter_01": {
      "-NxHistoryId001": {
        "voltage_v": 230.4,
        "current_a": 1.25,
        "power_w": 287.5,
        "energy_kwh": 0.82,
        "frequency_hz": 50.0,
        "power_factor": 0.91,
        "ts": 1710000000000
      }
    }
  }
}
```

Field description:

```text
voltage_v       voltage at the time of record
current_a       current at the time of record
power_w         power at the time of record
energy_kwh      energy value at the time of record
frequency_hz    frequency at the time of record
power_factor    power factor at the time of record
ts              timestamp in milliseconds
```

## /device_status

Path:

```text
/device_status/{deviceId}
```

Purpose:

Stores the online state and health information of the ESP32 device.

Written by:

```text
ESP32 firmware
```

Read by:

```text
Web dashboard
Android app
AI engine
```

Example:

```json
{
  "device_status": {
    "esp32_energy_meter_01": {
      "online": true,
      "last_seen": 1710000000000,
      "firmware_version": "1.0.0",
      "device_id": "esp32_energy_meter_01",
      "ip": "192.168.1.20",
      "wifi_rssi": -61,
      "uptime_s": 340,
      "free_heap": 185000,
      "sensor_status": "connected"
    }
  }
}
```

Field description:

```text
online             true if device is currently active
last_seen          last heartbeat timestamp
firmware_version   current firmware version
device_id          unique device identifier
ip                 local IP address of ESP32
wifi_rssi          WiFi signal strength
uptime_s           uptime in seconds
free_heap          available ESP32 memory
sensor_status      PZEM sensor state
```

Heartbeat interval:

```text
Every 10 seconds
```

Dashboard offline rule:

```text
If current time minus last_seen is greater than 30 seconds, show device as offline.
```

## /alerts

Path:

```text
/alerts/{deviceId}/{alertId}
```

Purpose:

Stores warnings, critical faults, and AI-generated alert messages.

Written by:

```text
ESP32 firmware
AI engine
```

Read by:

```text
Web dashboard
Android app
```

Example:

```json
{
  "alerts": {
    "esp32_energy_meter_01": {
      "-NxAlertId001": {
        "level": "warning",
        "type": "overvoltage",
        "source": "firmware",
        "message": "Voltage exceeded the safe threshold.",
        "value": 255.6,
        "threshold": 250.0,
        "acknowledged": false,
        "ts": 1710000000000
      }
    }
  }
}
```

Allowed alert levels:

```text
info
warning
critical
```

Allowed alert sources:

```text
firmware
ai_engine
dashboard
android
```

Allowed alert types:

```text
overvoltage
undervoltage
overcurrent
overload
poor_power_factor
sensor_disconnected
device_offline
high_consumption
abnormal_pattern
energy_limit_warning
```

Field description:

```text
level          alert severity
type           alert category
source         module that generated the alert
message        human-readable alert message
value          measured value that caused the alert
threshold      configured limit
acknowledged   true if user has acknowledged alert
ts             timestamp in milliseconds
```

## /ai_predictions

Path:

```text
/ai_predictions/{deviceId}
```

Purpose:

Stores the latest AI analysis result, prediction, usage classification, and recommendation.

Written by:

```text
AI engine
```

Read by:

```text
Web dashboard
Android app
TFT display if firmware fetches AI status later
```

Example:

```json
{
  "ai_predictions": {
    "esp32_energy_meter_01": {
      "risk_level": "normal",
      "anomaly": false,
      "usage_class": "moderate",
      "recommendation": "Energy consumption is within normal range.",
      "predicted_next_power_w": 310.2,
      "predicted_daily_kwh": 6.8,
      "predicted_monthly_kwh": 204.0,
      "estimated_monthly_cost": 38760.0,
      "confidence": 0.82,
      "ts": 1710000000000
    }
  }
}
```

Allowed risk levels:

```text
normal
warning
critical
```

Allowed usage classes:

```text
low
moderate
high
peak
abnormal
```

Field description:

```text
risk_level                current AI risk level
anomaly                   true if AI detects abnormal behavior
usage_class               energy usage classification
recommendation            user-friendly advice
predicted_next_power_w    estimated next power value
predicted_daily_kwh       estimated daily energy use
predicted_monthly_kwh     estimated monthly energy use
estimated_monthly_cost    estimated monthly electricity cost
confidence                confidence value from 0.0 to 1.0
ts                        timestamp in milliseconds
```

## /settings

Path:

```text
/settings/{deviceId}
```

Purpose:

Stores configurable limits, tariff values, and analytics settings.

Written by:

```text
Dashboard
Android app
Admin setup
```

Read by:

```text
ESP32 firmware
AI engine
Web dashboard
Android app
```

Example:

```json
{
  "settings": {
    "esp32_energy_meter_01": {
      "voltage_min_v": 180.0,
      "voltage_max_v": 250.0,
      "current_max_a": 10.0,
      "power_max_w": 2200.0,
      "power_factor_min": 0.75,
      "tariff_per_kwh": 190.0,
      "currency": "NGN",
      "prepaid_units_kwh": 55776.0,
      "history_interval_s": 30,
      "live_interval_s": 5,
      "heartbeat_interval_s": 10,
      "ai_enabled": true,
      "alerts_enabled": true
    }
  }
}
```

Field description:

```text
voltage_min_v          minimum safe voltage
voltage_max_v          maximum safe voltage
current_max_a          maximum safe current
power_max_w            maximum safe power
power_factor_min       minimum acceptable power factor
tariff_per_kwh         electricity tariff per kWh
currency               currency for billing estimate
prepaid_units_kwh      available prepaid energy units
history_interval_s     history upload interval
live_interval_s        live data upload interval
heartbeat_interval_s   device heartbeat interval
ai_enabled             enables AI analytics
alerts_enabled         enables alert generation
```

## /daily_summary

Path:

```text
/daily_summary/{deviceId}/{date}
```

Purpose:

Stores daily energy summaries generated by the AI engine.

Date format:

```text
YYYY-MM-DD
```

Example:

```json
{
  "daily_summary": {
    "esp32_energy_meter_01": {
      "2026-06-24": {
        "total_kwh": 7.4,
        "peak_power_w": 1850.0,
        "average_power_w": 420.0,
        "min_voltage_v": 218.5,
        "max_voltage_v": 244.1,
        "average_power_factor": 0.88,
        "estimated_cost": 1406.0,
        "alert_count": 2,
        "ts": 1710000000000
      }
    }
  }
}
```

## /monthly_summary

Path:

```text
/monthly_summary/{deviceId}/{month}
```

Purpose:

Stores monthly energy summaries and billing estimates.

Month format:

```text
YYYY-MM
```

Example:

```json
{
  "monthly_summary": {
    "esp32_energy_meter_01": {
      "2026-06": {
        "total_kwh": 204.0,
        "peak_power_w": 2350.0,
        "average_daily_kwh": 6.8,
        "estimated_cost": 38760.0,
        "alert_count": 18,
        "power_quality_score": 86,
        "ts": 1710000000000
      }
    }
  }
}
```

## /system_logs

Path:

```text
/system_logs/{deviceId}/{logId}
```

Purpose:

Stores important system events for debugging and auditing.

Written by:

```text
ESP32 firmware
AI engine
Dashboard
Android app
```

Example:

```json
{
  "system_logs": {
    "esp32_energy_meter_01": {
      "-NxLogId001": {
        "level": "info",
        "source": "firmware",
        "message": "Device connected to WiFi.",
        "ts": 1710000000000
      }
    }
  }
}
```

Allowed log levels:

```text
debug
info
warning
error
```

## ESP32 Write Responsibilities

The ESP32 firmware must write:

```text
/live/{deviceId}
/history/{deviceId}/{recordId}
/device_status/{deviceId}
/alerts/{deviceId}/{alertId}
/system_logs/{deviceId}/{logId}
```

The ESP32 firmware may read:

```text
/settings/{deviceId}
/ai_predictions/{deviceId}
```

## Web Dashboard Responsibilities

The web dashboard must read:

```text
/live/{deviceId}
/history/{deviceId}
/device_status/{deviceId}
/alerts/{deviceId}
/ai_predictions/{deviceId}
/settings/{deviceId}
/daily_summary/{deviceId}
/monthly_summary/{deviceId}
```

The web dashboard may write:

```text
/settings/{deviceId}
/alerts/{deviceId}/{alertId}/acknowledged
/system_logs/{deviceId}/{logId}
```

## Android App Responsibilities

The Android app must read:

```text
/live/{deviceId}
/history/{deviceId}
/device_status/{deviceId}
/alerts/{deviceId}
/ai_predictions/{deviceId}
/settings/{deviceId}
```

The Android app may write:

```text
/settings/{deviceId}
/alerts/{deviceId}/{alertId}/acknowledged
/system_logs/{deviceId}/{logId}
```

## AI Engine Responsibilities

The AI engine must read:

```text
/live/{deviceId}
/history/{deviceId}
/settings/{deviceId}
/device_status/{deviceId}
```

The AI engine must write:

```text
/ai_predictions/{deviceId}
/alerts/{deviceId}/{alertId}
/daily_summary/{deviceId}/{date}
/monthly_summary/{deviceId}/{month}
/system_logs/{deviceId}/{logId}
```

## Data Validation Rules

The system should reject or ignore invalid readings.

Recommended valid ranges:

```text
voltage_v        0 to 300
current_a        0 to 100
power_w          0 to 30000
energy_kwh       0 or greater
frequency_hz     40 to 70
power_factor     0.0 to 1.0
wifi_rssi        -100 to 0
```

If a reading is invalid, the ESP32 should:

```text
keep the previous valid reading
set sensor_status to reading_error
write an alert if the problem persists
show Sensor Error on TFT
```

## Dashboard Display Rules

If /live data exists and device is online, show live readings.

If /live data is missing, show:

```text
Waiting for device data
```

If /device_status last_seen is older than 30 seconds, show:

```text
Device offline
```

If sensor_status is disconnected, show:

```text
PZEM sensor disconnected
```

If AI data is missing, show:

```text
AI analysis pending
```

## TFT Display Rules

The TFT display should show:

```text
Voltage
Current
Power
Energy
Frequency
Power factor
WiFi state
Device status
AI or local risk state
```

The TFT must not display fake values.

If the PZEM is disconnected, show:

```text
Sensor disconnected
```

If WiFi is offline, show:

```text
WiFi offline
```

If Firebase upload fails, show:

```text
Cloud sync error
```

## Alert Threshold Defaults

Default thresholds:

```text
voltage_min_v       180.0
voltage_max_v       250.0
current_max_a       10.0
power_max_w         2200.0
power_factor_min    0.75
```

These values can be changed from:

```text
/settings/{deviceId}
```

## Complete Sample Database

```json
{
  "live": {
    "esp32_energy_meter_01": {
      "voltage_v": 230.4,
      "current_a": 1.25,
      "power_w": 287.5,
      "energy_kwh": 0.82,
      "frequency_hz": 50.0,
      "power_factor": 0.91,
      "wifi_rssi": -61,
      "uptime_s": 340,
      "status": "ok",
      "sensor_status": "connected",
      "power_quality": "normal",
      "ts": 1710000000000
    }
  },
  "device_status": {
    "esp32_energy_meter_01": {
      "online": true,
      "last_seen": 1710000000000,
      "firmware_version": "1.0.0",
      "device_id": "esp32_energy_meter_01",
      "ip": "192.168.1.20",
      "wifi_rssi": -61,
      "uptime_s": 340,
      "free_heap": 185000,
      "sensor_status": "connected"
    }
  },
  "history": {
    "esp32_energy_meter_01": {
      "-NxHistoryId001": {
        "voltage_v": 230.4,
        "current_a": 1.25,
        "power_w": 287.5,
        "energy_kwh": 0.82,
        "frequency_hz": 50.0,
        "power_factor": 0.91,
        "ts": 1710000000000
      }
    }
  },
  "alerts": {
    "esp32_energy_meter_01": {
      "-NxAlertId001": {
        "level": "warning",
        "type": "overvoltage",
        "source": "firmware",
        "message": "Voltage exceeded the safe threshold.",
        "value": 255.6,
        "threshold": 250.0,
        "acknowledged": false,
        "ts": 1710000000000
      }
    }
  },
  "ai_predictions": {
    "esp32_energy_meter_01": {
      "risk_level": "normal",
      "anomaly": false,
      "usage_class": "moderate",
      "recommendation": "Energy consumption is within normal range.",
      "predicted_next_power_w": 310.2,
      "predicted_daily_kwh": 6.8,
      "predicted_monthly_kwh": 204.0,
      "estimated_monthly_cost": 38760.0,
      "confidence": 0.82,
      "ts": 1710000000000
    }
  },
  "settings": {
    "esp32_energy_meter_01": {
      "voltage_min_v": 180.0,
      "voltage_max_v": 250.0,
      "current_max_a": 10.0,
      "power_max_w": 2200.0,
      "power_factor_min": 0.75,
      "tariff_per_kwh": 190.0,
      "currency": "NGN",
      "prepaid_units_kwh": 55776.0,
      "history_interval_s": 30,
      "live_interval_s": 5,
      "heartbeat_interval_s": 10,
      "ai_enabled": true,
      "alerts_enabled": true
    }
  }
}
```

## Version

Data contract version:

```text
1.0.0
```

Last updated:

```text
2026-06-24
```
