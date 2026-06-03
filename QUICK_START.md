# Smart Energy Monitor - Quick Start Guide

## 🎯 Current Status
✅ Relay hardware fully configured and tested  
✅ MicroPython v1.27.0 firmware installed  
✅ Firebase configuration complete  
✅ boot.py and main.py uploaded to ESP32  

## ⚡ What to Do Now

### 1. Power Cycle Your ESP32
- Disconnect USB cable from computer
- Disconnect power from relay circuits
- Wait 5 seconds
- Reconnect USB cable
- Reconnect relay power

### 2. Observe LED Indicators
| LED Color | Meaning |
|-----------|---------|
| 🟦 Blinking Blue | WiFi connecting |
| 🟩 Solid Green | WiFi connected ✓ |
| 🔴 Solid Red | WiFi error |

### 3. Listen for Relay Clicks
During boot, relays are tested. You should hear 4 clicks (one per zone).

### 4. Verify Firebase Data
1. Open: https://console.firebase.google.com
2. Go to your project: smart-energy-monitor-5b72b
3. Click "Realtime Database"
4. Navigate to `/live` 
5. You should see:
   - voltage, current, power, energy
   - frequency, power factor
   - zone1, zone2, zone3, zone4 status
   - timestamp (updates every 5 seconds)

### 5. Test Relay Control from Dashboard
1. Open: https://smart-energy-monitor-5b72b.web.app
2. Go to "Control Panel"
3. Click "Zone 1 ON"
4. **You should hear a relay click**
5. Check Firebase `/live/zone1` should show "on"
6. Click "Zone 1 OFF"
7. **You should hear another relay click**

## 🔍 Manual Testing (Advanced)

### Connect to ESP32 REPL
```bash
screen /dev/ttyACM0 115200
# Or use Ctrl+Backtick in VS Code to open terminal
```

### Test WiFi Status
```python
import network
wlan = network.WLAN(network.STA_IF)
print(wlan.ifconfig())  # Should show IP like (192.168.x.x, ...)
```

### Test Relay (Manual Toggle)
```python
from machine import Pin
z1 = Pin(26, Pin.OUT)
z1.off()  # Turn ON (listen for click)
z1.on()   # Turn OFF
```

### Run Main Application
```python
exec(open('main.py').read())
# This starts the main relay controller
# Exit with Ctrl+C
```

### Check Live Data
```python
import urequests
url = "https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app/live.json?auth=5d1073f7a8884d5345a44b2349800eab769a961d"
r = urequests.get(url)
print(r.json())
```

## 📊 Expected Data Format

When everything is working, `/live` should contain:
```json
{
  "current": 2.5,
  "energy": 1234.5,
  "frequency": 50.0,
  "pf": 0.95,
  "power": 520,
  "timestamp": 1704726000,
  "voltage": 220,
  "zone1": "off",
  "zone2": "on",
  "zone3": "off",
  "zone4": "off"
}
```

## 🐛 Troubleshooting

### Green LED never appears (WiFi not connecting)
```python
# Check WiFi settings
import network
wlan = network.WLAN(network.STA_IF)
wlan.active(True)
wlan.connect('MTN WIFI', '99999999')
import time
time.sleep(5)
print(wlan.isconnected())  # Should print True
```

### Relays not clicking
```python
# Test GPIO control
from machine import Pin
z = Pin(26, Pin.OUT)
z.off()   # GPIO LOW = relay ON
z.on()    # GPIO HIGH = relay OFF
# If relay clicks, hardware works
```

### Firebase data not updating
1. Check WiFi is connected (green LED)
2. Verify Firebase secret: `5d1073f7a8884d5345a44b2349800eab769a961d`
3. Check database URL: `https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app`
4. Try manually:
```python
import urequests
url = "https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app/live/zone1.json?auth=5d1073f7a8884d5345a44b2349800eab769a961d"
r = urequests.put(url, json="on")
print(r.status_code)  # Should be 200
```

### Can't connect to REPL
1. Check USB cable is properly connected
2. Verify `/dev/ttyACM0` exists: `ls /dev/ttyACM0`
3. Try unplugging and reconnecting ESP32
4. Check for other serial connections: `sudo lsof /dev/ttyACM0`

## 🔗 Important URLs

| Component | URL |
|-----------|-----|
| Firebase Database | https://console.firebase.google.com/u/0/project/smart-energy-monitor-5b72b/database/data |
| React Dashboard | https://smart-energy-monitor-5b72b.web.app |
| API Endpoint | https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app |

## 📁 Files You Have

| File | Purpose |
|------|---------|
| `boot.py` | Auto-runs on startup, initializes relays and WiFi |
| `main.py` | Main application, handles Firebase & sensor reading |
| `test_relay_system.py` | Comprehensive test script |
| `RELAY_SETUP_COMPLETE.md` | Full technical documentation |

## ⏱️ Expected Behavior Timeline

**At Power-up (0-2 seconds):**
- Green LED blinks briefly

**During Boot (2-15 seconds):**
- Blue LED solid while connecting to WiFi
- 4 relay clicks (testing each zone)
- Green LED solid when WiFi connected

**During Operation (5-second intervals):**
- Sensor data reads from PZEM on UART2
- Firebase `/live` updates with measurements
- Listens for relay commands from `/relay_commands`

**When Relay Switches:**
- Relay clicks immediately
- `/live/zone1` updates within 1 second
- React dashboard reflects new state within 1-2 seconds

## ✨ Success Checklist

- [ ] USB cable connected to ESP32
- [ ] Relay power supply connected
- [ ] Green LED lights up after boot
- [ ] Can see data in Firebase `/live`
- [ ] Relay clicks when toggled from dashboard
- [ ] All 4 zones respond to on/off commands
- [ ] React dashboard shows sensor values

---
**Questions?** Check RELAY_SETUP_COMPLETE.md for detailed troubleshooting
