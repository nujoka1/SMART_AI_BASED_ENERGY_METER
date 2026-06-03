# Arduino IDE Setup Guide

## Required Libraries for Smart Energy Monitor

Install these libraries in Arduino IDE to avoid compilation errors:

### Method: Arduino IDE Library Manager

1. **Open Arduino IDE**
2. **Go to**: Sketch → Include Library → Manage Libraries
3. **Search and install each:**

### Required Libraries (Essential)

1. **ArduinoJson** (by Benoit Blanchon)
   - Search: "ArduinoJson"
   - Version: 6.21.0 or later
   - Purpose: JSON parsing for Firebase communication

2. **TFT_eSPI** (by Bodmer)
   - Search: "TFT_eSPI"
   - Version: Latest
   - Purpose: TFT display driver
   - **IMPORTANT**: After install, configure for your display:
     ```
     Goto: Arduino/libraries/TFT_eSPI/User_Setup.h
     Look for ESP32 TFT setup and configure:
     - Display driver (ILI9341, ST7789, etc.)
     - GPIO pins for CS, DC, RST
     ```

### Optional Libraries (for old Firebase library)

Do NOT install these if using the new sketch version:
- ✗ FirebaseESP32 (old, causes conflicts)
- ✗ Firebase Realtime Database (may conflict)

### Libraries Already Installed (ESP32 Board)

These come with ESP32 board package:
- ✓ WiFi
- ✓ HTTPClient (needed for direct HTTP calls)
- ✓ HardwareSerial

## Recommended Arduino IDE Settings

**Board Options:**
- Board: ESP32 Dev Module
- Upload Speed: 921600
- CPU Frequency: 240MHz
- Flash Mode: QIO
- Flash Frequency: 80MHz
- Flash Size: 4MB
- Partition Scheme: Default 4MB with spiffs

## Installation Steps

### Step 1: Install ESP32 Board (if not already done)
1. File → Preferences
2. Add board URL: `https://dl.espressif.com/dl/package_esp32_index.json`
3. Tools → Board → Boards Manager
4. Search "esp32" and install by Espressif Systems

### Step 2: Install Required Libraries
1. Sketch → Include Library → Manage Libraries
2. Search and install:
   - **ArduinoJson** by Benoit Blanchon
   - **TFT_eSPI** by Bodmer

### Step 3: Configure TFT_eSPI
After installing TFT_eSPI:

1. Locate: `~/Arduino/libraries/TFT_eSPI/User_Setup.h`
2. Find the ESP32 section and uncomment your display type
3. Add your GPIO pin configuration:
```cpp
// For ILI9341 display
#define ILI9341_DRIVER

// GPIO pins (adjust for your wiring)
#define TFT_CS   5    // Chip select
#define TFT_DC   4    // Data/Command
#define TFT_RST  22   // Reset
#define TFT_MOSI 23   // MOSI
#define TFT_MISO 19   // MISO (optional)
#define TFT_CLK  18   // Clock
```

### Step 4: Upload Code

1. Open **smart_energy_monitor_v2.ino** (NOT v1.0 - that one has library conflicts)
2. Connect ESP32 via USB
3. Tools → Port → Select /dev/ttyACM0
4. Click Upload (Ctrl+U)

## Compilation Troubleshooting

### Error: "cannot convert 'const char' to 'FirebaseConfig'"
**Solution**: You're using old FirebaseESP32 library. Uninstall it:
1. Tools → Manage Libraries
2. Search "FirebaseESP32"
3. Click "Remove"
4. Use **v2 sketch** instead

### Error: "TFT_eSPI.h not found"
**Solution**: Install TFT_eSPI library:
1. Sketch → Include Library → Manage Libraries
2. Search "TFT_eSPI"
3. Click Install

### Error: "ArduinoJson.h not found"
**Solution**: Install ArduinoJson library:
1. Sketch → Include Library → Manage Libraries
2. Search "ArduinoJson"
3. Click Install (version 6.21+)

### Multiple libraries warning
This is normal. Arduino IDE found duplicate libraries. It uses the one listed first.

## Which Sketch to Use?

- ✅ **Use**: `smart_energy_monitor_v2.ino` (RECOMMENDED)
  - Uses direct HTTP calls to Firebase
  - No complex library conflicts
  - Compatible with all library versions
  - Simpler error handling

- ⚠️ **Avoid**: `smart_energy_monitor_arduino.ino` (OLD)
  - Requires specific Firebase library version
  - More prone to compilation errors
  - Not recommended anymore

## Quick Install Checklist

```
[ ] Arduino IDE installed
[ ] ESP32 board package installed
[ ] ArduinoJson library installed
[ ] TFT_eSPI library installed
[ ] TFT_eSPI configured with display type
[ ] TFT_eSPI GPIO pins match your hardware
[ ] Port selected (/dev/ttyACM0)
[ ] smart_energy_monitor_v2.ino selected
[ ] Upload successful (no red errors)
```

## After Upload

1. Serial monitor should show boot messages
2. TFT display should show "System Ready!" after ~3 seconds
3. Green LED should light when WiFi connects
4. Sensor data appears in Firebase `/live` every 5 seconds
5. Relays respond to Firebase `/relay_commands` within 2 seconds

## Need Help?

If compilation fails:
1. Check you're using **v2 sketch**
2. Verify ArduinoJson and TFT_eSPI are installed
3. Check "Show verbose output" in Preferences
4. Search the full error message online (often library version issue)
