# 🚀 Smart Energy System - Complete Deployment Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       SMART ENERGY SYSTEM                       │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────┐      ┌──────────────────┐                │
│  │  ESP32 Hardware  │      │  Firebase RTDB   │                │
│  │  + PZEM-004T     │◄────►│  (Real-time DB)  │                │
│  │  + TFT Display   │      │                  │                │
│  │  + 4 Relays      │      │  /live           │                │
│  │  + LEDs          │      │  /ai_output      │                │
│  └──────────────────┘      │  /history        │                │
│         │                  │  /events         │                │
│         │                  │  /relay_commands │                │
│         │                  └──────────────────┘                │
│         │                         ▲                             │
│         │                         │                             │
│  ┌──────┴──────────────┬──────────┴──────────────┐              │
│  │                     │                        │              │
│  ▼                     ▼                        ▼              │
│ ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐      │
│ │  AI Engine   │  │   React Web  │  │  Mobile App      │      │
│ │  (Python)    │  │   Dashboard  │  │  (React Native)  │      │
│ │              │  │              │  │  or Flutter      │      │
│ │ - ARIMA      │  │ - Dashboard  │  │                  │      │
│ │ - Anomaly    │  │ - Analytics  │  │ - Control Zones  │      │
│ │ - Burn Rate  │  │ - Control    │  │ - Real-time Data │      │
│ │ - Forecast   │  │ - Events Log │  │ - Notifications  │      │
│ └──────────────┘  └──────────────┘  └──────────────────┘      │
│         │                │                    │                │
│         └────────────────┴────────────────────┘                │
│                          │                                      │
│                    Laptop/Raspberry Pi/Cloud                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Firebase Setup ✅

### 1.1 Firebase Project Configuration
```bash
# 1. Go to Firebase Console: https://console.firebase.google.com
# 2. Create new project: "Smart-Energy-Monitor"
# 3. Enable Realtime Database (choose "Start in test mode")
# 4. Get your credentials:
#    - Database URL: From Realtime Database settings
#    - Secret Key: Project Settings > Service Accounts > Database Secrets
# 5. Add your credentials to .env file
```

### 1.2 Firebase RTDB Structure
```json
{
  "live": {
    "v": 230.5,
    "i": 2.45,
    "w": 560.0,
    "kwh": 1240.35,
    "pf": 0.95,
    "hz": 50.0,
    "ts": 1685923400000,
    "anomaly": false
  },
  "ai_output": {
    "prediction_1h": 520.5,
    "prediction_6h": 480.3,
    "anomaly": false,
    "anomaly_score": 0.15,
    "burn_rate_wph": 450.2,
    "depletion_hours": 124.5,
    "classification": "Normal usage"
  },
  "history": {
    "entry1": { "ts": 1685923400, "w": 560, ... },
    "entry2": { "ts": 1685923410, "w": 570, ... }
  },
  "events": {
    "evt1": { "ts": 1685923400, "type": "relay", ... },
    "evt2": { "ts": 1685923410, "type": "anomaly", ... }
  },
  "relay_commands": {
    "z1": true,
    "z2": true,
    "z3": false,
    "z4": true
  }
}
```

---

## Phase 2: AI Engine Setup ✅

### 2.1 Installation
```bash
# From project root
pip install -r requirements.txt
pip install statsmodels  # For ARIMA forecasting
```

### 2.2 Configuration
```bash
# Edit .env
AI_FIREBASE_URL=https://your_project.firebaseio.com
AI_FIREBASE_SECRET=your_secret_key_here
AI_POLL_INTERVAL=5
AI_WRITE_INTERVAL=10
AI_ANOMALY_THRESHOLD=2.5
AI_PREPAID_UNITS_KWH=55776
AI_LOG_LEVEL=INFO
```

### 2.3 Running AI Engine
```bash
# Development (local)
python ai_engine_v2.py

# Production (Raspberry Pi with systemd)
sudo systemctl start ai-engine.service
sudo systemctl status ai-engine.service
```

### 2.4 Pre-seed Firebase (Optional)
```bash
# Generate 7 days of synthetic data
python ai_engine_v2.py --seed 7

# Or:
python ai_engine_v2.py --seed 14  # 14 days
```

---

## Phase 3: React Web Dashboard ⏳

### 3.1 Installation
```bash
npm install
```

### 3.2 Environment Configuration
```bash
# Create .env (React reads REACT_APP_* variables)
REACT_APP_FIREBASE_API_KEY=your_api_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
REACT_APP_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_bucket
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

### 3.3 Development Server
```bash
npm start
# Opens http://localhost:3000
```

### 3.4 Build for Production
```bash
npm run build
# Creates ./build directory ready for deployment
```

### 3.5 Deploy to Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase Hosting
firebase init hosting

# Deploy
firebase deploy --only hosting
```

---

## Phase 4: ESP32 Firmware

### 4.1 Hardware Setup
```
ESP32 Connections:
  PZEM-004T (UART2):
    - RX: GPIO 16
    - TX: GPIO 17
  
  4-Channel Relay:
    - Z1: GPIO 26
    - Z2: GPIO 27
    - Z3: GPIO 14
    - Z4: GPIO 12
  
  Status LEDs:
    - Green (OK): GPIO 18
    - Red (Alert): GPIO 19
    - Blue (WiFi): GPIO 21
  
  TFT Display (SPI):
    - CS: GPIO 5
    - DC: GPIO 23
    - MOSI: GPIO 19
    - MISO: GPIO 25
    - SCK: GPIO 18
```

### 4.2 Arduino Libraries Required
Install via Arduino Library Manager:
- PZEM004Tv30 (by Olexa Moskalenko)
- ArduinoJson v6
- TFT_eSPI (by Bodmer)
- WiFi (built-in)
- HTTPClient (built-in)

### 4.3 Configuration
```cpp
const char* WIFI_SSID = "MTN WIFI";
const char* WIFI_PASSWORD = "99999999";
const char* FB_SECRET = "your_firebase_secret";
const char* FB_HOST = "your_project.firebaseio.com";
```

### 4.4 Flashing
1. Open `smart_energy_monitor.ino` in Arduino IDE
2. Select: Board = ESP32 Dev Module
3. Select: COM Port
4. Click Upload

---

## Phase 5: Mobile App (Optional)

### 5.1 React Native Setup
```bash
npm install -g @react-native-community/cli

# Create new project
npx create-expo-app EnergyMonitorApp
cd EnergyMonitorApp
npm install firebase react-native-reanimated recharts-native
```

### 5.2 Flutter Setup
```bash
flutter create energy_monitor_app
cd energy_monitor_app

# Add dependencies (pubspec.yaml):
firebase_database: ^10.0.0
flutter_riverpod: ^2.0.0
charts_flutter: ^0.12.0
```

---

## Deployment Checklist

### Pre-Deployment
- [ ] Firebase project created & configured
- [ ] Firebase RTDB security rules updated
- [ ] .env file configured with all credentials
- [ ] AI engine tested locally (at least 1 test run)
- [ ] React dashboard builds without errors (`npm run build`)
- [ ] ESP32 firmware compiles & uploads successfully

### Deployment Options

**Option A: Local Development**
```bash
# Terminal 1: AI Engine
python ai_engine_v2.py

# Terminal 2: React Dashboard
npm start  # http://localhost:3000

# Hardware: ESP32 running with Wifi
```

**Option B: Raspberry Pi + Laptop**
```bash
# RPi: AI Engine (auto-restart with systemd)
sudo systemctl start ai-engine.service

# Laptop: React Dashboard
npm start

# Hardware: ESP32 on WiFi
```

**Option C: Full Cloud**
```bash
# Firebase Hosting: React Dashboard
firebase deploy --only hosting

# Cloud Run: AI Engine
# (Docker containerized version)

# Firebase Functions: Optional serverless functions
```

**Option D: Docker Compose (All-in-one)**
```bash
docker-compose up -d
# Contains: AI Engine + React (nginx) + Optional database
```

---

## Monitoring & Logs

### AI Engine Logs
```bash
# Real-time monitoring
tail -f ai_engine.log

# Search for anomalies
grep "ANOMALY" ai_engine.log
```

### React Dashboard
- Browser Developer Tools: F12
- Console: Check for Firebase connection errors
- Network: Verify Firebase requests

### ESP32 Monitor
```bash
# View serial output
screen /dev/ttyUSB0 115200
# Or: arduino-cli monitor -p COM3
```

### Firebase Console
- Monitor `/ai_output` node for predictions
- Check `/live` for real-time sensor data
- Review `/events` for system activity

---

## Production Best Practices

### Security
- [ ] Enable Firebase Authentication (OAuth, Email)
- [ ] Set restrictive Firebase RTDB rules
- [ ] Use environment variables (never commit secrets)
- [ ] Enable HTTPS everywhere
- [ ] Rotate API keys regularly

### Reliability
- [ ] Set up Firebase Backups
- [ ] Enable Email alerts for anomalies
- [ ] Monitor AI engine uptime with health checks
- [ ] Deploy AI engine with Docker for easier updates
- [ ] Set up CI/CD pipeline (GitHub Actions)

### Monitoring
- [ ] Alert thresholds configured
- [ ] Email/SMS notifications enabled
- [ ] Status dashboard for system health
- [ ] Log retention configured

### Performance
- [ ] Optimize React bundle size
- [ ] Cache historical data locally
- [ ] Compress Firebase data
- [ ] CDN for static assets (via Firebase Hosting)

---

## Troubleshooting

### Firebase Connection Issues
```bash
# Check connectivity
ping firebase.google.com

# Verify credentials in .env
python -c "from dotenv import load_dotenv; import os; load_dotenv(); print(os.getenv('AI_FIREBASE_SECRET'))"

# Check Firebase console for errors
```

### AI Engine Not Starting
```bash
# Check Python dependencies
pip list | grep -E "numpy|scikit-learn|statsmodels"

# Test Firebase connection
python -c "import requests; r=requests.get('https://.../.json?auth=...'); print(r.status_code)"
```

### React Dashboard Blank
```bash
# Check for build errors
npm run build

# Verify .env variables
cat .env | grep REACT_APP_

# Check browser console for errors (F12)
```

---

## Next Steps

1. ✅ Configure Firebase RTDB
2. ✅ Deploy AI Engine (Python)
3. ⏳ Complete React Dashboard
4. ⏳ Flash ESP32 Firmware
5. ⏳ Build Mobile App (optional)
6. ⏳ Set up monitoring & alerts
7. ⏳ Production deployment

---

## Support & Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://react.dev)
- [ESP32 Arduino Core](https://github.com/espressif/arduino-esp32)
- [PZEM-004T Library](https://github.com/olevargas39/PZEM-004Tv30)
- [Tailwind CSS](https://tailwindcss.com)

**Questions?** Check the `.log` files or Firebase console first!
