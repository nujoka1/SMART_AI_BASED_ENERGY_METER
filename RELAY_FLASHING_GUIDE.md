# ESP32 Relay Flashing Guide

## 🎯 Quick Summary
You're flashing the **smart_energy_monitor.ino** sketch to ESP32 with **4 relay zones** on GPIO pins: **26, 27, 14, 12**

---

## ✅ Step 1: Arduino IDE Setup

### 1.1 Install Arduino IDE
- Download: https://www.arduino.cc/en/software
- Install and launch

### 1.2 Add ESP32 Board Manager
1. **File → Preferences**
2. **Additional Boards Manager URLs:** Add this line:
   ```
   https://dl.espressif.com/dl/package_esp32_index.json
   ```
3. **OK**
4. **Tools → Board → Boards Manager**
5. Search: `esp32`
6. Install **ESP32 by Espressif Systems** (latest version)
7. Close Boards Manager

### 1.3 Select Board
- **Tools → Board → ESP32 Arduino → ESP32 Dev Module**

### 1.4 Set Port
- **Tools → Port → /dev/ttyUSB0** (or your COM port)

### 1.5 Set Upload Speed
- **Tools → Upload Speed → 115200**

---

## ✅ Step 2: Install Required Libraries

1. **Tools → Manage Libraries**
2. Install these (search one by one):
   - `PZEM004Tv30` by Olexa Moskalenko
   - `ArduinoJson` by Benoit Blanchon (select version 6.x)
   - `TFT_eSPI` by Bodmer

3. **Close** Library Manager

---

## ✅ Step 3: Update WiFi Credentials

**Open:** `smart_energy_monitor.ino`

**Find lines 43-44:**
```cpp
const char* WIFI_SSID     = "MTN WIFI";
const char* WIFI_PASSWORD = "99999999";
```

**Replace with your actual WiFi:**
```cpp
const char* WIFI_SSID     = "MTN WIFI";
const char* WIFI_PASSWORD = "your_actual_password_here";
```

---

## ✅ Step 4: Verify Relay Pin Configuration

**Lines 56-59 (ALREADY CORRECT):**
```cpp
#define RELAY_Z1_PIN    26    // Zone 1: AC unit / heavy load
#define RELAY_Z2_PIN    27    // Zone 2: Water heater
#define RELAY_Z3_PIN    14    // Zone 3: General sockets
#define RELAY_Z4_PIN    12    // Zone 4: Lighting / spare
```

✅ **These are correct. DO NOT CHANGE.**

**Connection checklist:**
- [ ] Zone 1 relay signal → GPIO 26
- [ ] Zone 2 relay signal → GPIO 27
- [ ] Zone 3 relay signal → GPIO 14
- [ ] Zone 4 relay signal → GPIO 12
- [ ] Relay GND → ESP32 GND
- [ ] Relay VCC → 5V (from USB or external)

---

## ✅ Step 5: Flash the Sketch

1. **Plug in ESP32** via USB
2. **Sketch → Upload** (Ctrl+U)
3. Wait for: `Leaving... Hard resetting via RTS pin...`
4. ✅ **Flashing complete!**

---

## ✅ Step 6: Monitor Serial Output

1. **Tools → Serial Monitor** (Ctrl+Shift+M)
2. **Speed:** 115200 baud
3. **Watch for:**
   ```
   WiFi connecting to MTN WIFI...
   WiFi connected! IP: 192.168.x.x
   Firebase connected ✓
   Reading PZEM every 2s
   Polling relay commands every 3s
   ```

---

## 🧪 Step 7: Test Relays from Dashboard

1. Open: https://smart-energy-monitor-5b72b.web.app/
2. Navigate to: **Control Panel** page
3. Try toggling each zone:
   - [ ] Zone 1 (AC unit) - relay should click
   - [ ] Zone 2 (Water heater) - relay should click
   - [ ] Zone 3 (Sockets) - relay should click
   - [ ] Zone 4 (Lighting) - relay should click

**Expected behavior:**
- ✅ Button changes color when pressed
- ✅ You hear relay click (click = ON, silent = OFF)
- ✅ Status appears in Events Log

---

## 🔴 Troubleshooting

| Issue | Solution |
|-------|----------|
| **Upload fails: "No module named 'esptool'"** | Install: `pip install esptool` |
| **Port not showing** | USB driver issue - check ESP32 cable |
| **WiFi not connecting** | Verify SSID/password are correct |
| **Relays not responding** | Check GPIO pin connections |
| **Serial monitor shows garbage** | Change baud to 115200 |

---

## ✅ Success Indicators

After flashing and testing:
- ✅ Serial monitor shows WiFi + Firebase connected
- ✅ Relays click when toggled from dashboard
- ✅ Events appear in the dashboard
- ✅ Status LEDs blink (green=WiFi, red=anomaly)

**You're done!** 🎉 The relay is now fully integrated.

---

## Next Steps

1. Run AI engine continuously: `python ai_engine_v2.py`
2. Monitor dashboard for real-time data
3. Test auto-cutoff triggers at high power
