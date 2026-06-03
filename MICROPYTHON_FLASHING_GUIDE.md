# MicroPython ESP32 Flashing Guide

## 🎯 Overview
Flash MicroPython firmware onto ESP32, then upload the relay control script.

---

## ✅ Step 1: Install esptool.py

```bash
pip install esptool
```

Verify:
```bash
esptool.py version
```

---

## ✅ Step 2: Download MicroPython Firmware

1. Visit: https://micropython.org/download/esp32/
2. Download the **latest STM32 generic** version (e.g., `esp32-20240105-v1.22.1.bin`)
3. Save to your project folder

---

## ✅ Step 3: Identify Your USB Port

**Linux/Mac:**
```bash
ls /dev/tty*
```
Look for: `/dev/ttyUSB0` or `/dev/ttyACM0`

**Windows:**
Check Device Manager, typically `COM3` or `COM4`

---

## ✅ Step 4: Erase ESP32 Flash

```bash
esptool.py --port /dev/ttyUSB0 erase_flash
```

Wait for completion (30-60 seconds):
```
Erasing flash (this may take a while)...
[100%] Erased: 152.04s
```

---

## ✅ Step 5: Flash MicroPython Firmware

```bash
esptool.py --port /dev/ttyUSB0 --baud 460800 write_flash -z 0x1000 esp32-20240105-v1.22.1.bin
```

Expected output:
```
[100%] Writing at 0x001a3018... (took 8.47s)
```

---

## ✅ Step 6: Install ampy (File Upload Tool)

```bash
pip install adafruit-ampy
```

---

## ✅ Step 7: Connect to ESP32 & Upload Script

### Option A: Using ampy (Recommended)

1. **Put ESP32 in bootloader mode** (or just connect via USB)

2. **List files on ESP32:**
```bash
ampy --port /dev/ttyUSB0 ls /
```

3. **Upload the MicroPython script:**
```bash
ampy --port /dev/ttyUSB0 put esp32_micropython_main.py main.py
```

4. **Reboot ESP32** (disconnect/reconnect USB or press RST button)

### Option B: Using WebREPL (Web Interface)

1. **Connect to ESP32 serial:**
```bash
screen /dev/ttyUSB0 115200
```

2. **Create `boot.py` with WebREPL enabled:**
```python
import webrepl
webrepl.start()
```

3. **Upload via WebREPL web interface** (easier for multiple file uploads)

---

## ✅ Step 8: Configure WiFi Credentials

**Edit `esp32_micropython_main.py` line 34:**
```python
WIFI_SSID = "MTN WIFI"
WIFI_PASS = "your_password_here"  # ← Change this
```

Re-upload:
```bash
ampy --port /dev/ttyUSB0 put esp32_micropython_main.py main.py
```

---

## ✅ Step 9: Monitor Serial Output

### Option A: Using screen
```bash
screen /dev/ttyUSB0 115200
```

### Option B: Using pyserial-miniterm
```bash
pip install pyserial
miniterm.py /dev/ttyUSB0 115200
```

### Option C: Using ampy
```bash
ampy --port /dev/ttyUSB0 run esp32_micropython_main.py
```

**Expected output:**
```
Starting Smart Energy Monitor (MicroPython)...
Connecting to MTN WIFI...
WiFi connected: 192.168.1.100
Initialization complete. Starting data loop...
PZEM: 230.5V, 2.34A, 538W
```

---

## 🧪 Testing Relays

### From Serial Console

After the script is running, press `Ctrl+C` to enter REPL, then:

```python
from __main__ import relay_on, relay_off
relay_on('z1')   # Turn ON relay zone 1
relay_off('z1')  # Turn OFF relay zone 1
```

### From Dashboard

1. Open: https://smart-energy-monitor-5b72b.web.app/
2. Go to: **Control Panel**
3. Toggle each zone → relays should click
4. Check **Events Log** for relay events

---

## 🛠️ Troubleshooting

| Issue | Solution |
|-------|----------|
| **"No module named 'esptool'"** | `pip install esptool` |
| **Port not found** | Check USB connection, drivers |
| **"Permission denied /dev/ttyUSB0"** | Linux: `sudo chmod 666 /dev/ttyUSB0` |
| **Script doesn't run** | Check: `ampy ls /` (should show `main.py`) |
| **WiFi not connecting** | Verify SSID/password in script |
| **Broken REPL** (need factory reset) | Erase & reflash firmware |

---

## 📦 File Structure After Flashing

```
ESP32 Flash Memory:
├── boot.py           (optional, runs first)
├── main.py          (your relay control script)
└── lib/             (MicroPython standard library)
```

---

## ✅ Success Indicators

- ✅ Serial output shows "WiFi connected"
- ✅ PZEM readings appear every 2 seconds
- ✅ Relays click when toggled from dashboard
- ✅ Data appears in Firebase `/live` node
- ✅ Events logged in dashboard

---

## 🔄 Next Steps

1. **Run AI engine** in background:
   ```bash
   source ~/yoloenv/bin/activate
   python ai_engine_v2.py
   ```

2. **Start React dashboard**:
   ```bash
   npm start
   ```

3. **Monitor in real-time** at: https://smart-energy-monitor-5b72b.web.app/

---

## 📝 MicroPython Advantages

- ✅ Fast iteration (no compile time)
- ✅ REPL for live testing
- ✅ Easier debugging
- ✅ Smaller codebase
- ✅ Python-based (familiar for backend developers)

---

## 🆘 Still Stuck?

Try this quick reset:
```bash
# 1. Erase everything
esptool.py --port /dev/ttyUSB0 erase_flash

# 2. Flash fresh MicroPython
esptool.py --port /dev/ttyUSB0 write_flash -z 0x1000 esp32-latest.bin

# 3. Upload script fresh
ampy --port /dev/ttyUSB0 put esp32_micropython_main.py main.py

# 4. Connect and reboot
```
