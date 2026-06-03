# ⚡ AI Engine Setup & Deployment Guide

## Phase 1: AI Engine Configuration

### Step 1: Install Dependencies
```bash
cd /home/nujoka/Documents/Project-Store/500l_projects/Emmanue_judge&Khadijah/Smart_AI_Based_Energy-Meter

# Install all required packages
pip install -r requirements.txt

# Optional: For advanced forecasting with ARIMA
pip install statsmodels==0.14.0
```

### Step 2: Configure .env File
```bash
# Copy example
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env
```

Update these variables with YOUR Firebase values:
```env
# AI Engine Configuration
AI_FIREBASE_URL=https://your_firebase_project.firebaseio.com
AI_FIREBASE_SECRET=your_firebase_secret_key_here
AI_POLL_INTERVAL=5
AI_WRITE_INTERVAL=10
AI_ANOMALY_THRESHOLD=2.5
AI_PREPAID_UNITS_KWH=55776
AI_LOG_LEVEL=INFO
```

**How to find your Firebase credentials:**
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your Smart Energy Monitor project
3. Go to **Realtime Database** → **Rules** tab
4. You'll see your database URL
5. For the secret key: **Project Settings** → **Service Accounts** → **Database Secrets**

### Step 3: Pre-Populate Firebase with Test Data (Optional)
```bash
# Generate 7 days of synthetic data and upload to Firebase
python ai_engine_v2.py --seed 7

# Or just 3 days:
python ai_engine_v2.py --seed 3
```

This creates realistic Nigerian household load profiles for testing before hardware is connected.

---

## Phase 2: Running the AI Engine

### Local Development (Your Laptop)
```bash
python ai_engine_v2.py
```

You should see:
```
💡 Starting AI ENGINE
   Firebase: https://your_project.firebaseio.com
   Poll interval: 5s
   Models: ARIMA enabled (advanced) ✅
   Anomaly: Hybrid (Isolation Forest + Z-score) ✅

✅ NORMAL | W: 450.5W | Anom:0.12 | Pred1h: 500W | Dep:240.5h | Normal usage
```

### Raspberry Pi (Persistent Inference)
```bash
# SSH into your Raspberry Pi
ssh pi@your_rpi_ip

# Clone the project
git clone <your-repo>
cd Smart_AI_Based_Energy-Meter

# Install Python dependencies
pip install -r requirements.txt

# Run in background with nohup
nohup python ai_engine_v2.py > ai_engine.log 2>&1 &

# Or use systemd service (recommended for auto-restart)
sudo nano /etc/systemd/system/ai-engine.service
```

**Systemd Service File** (`/etc/systemd/system/ai-engine.service`):
```ini
[Unit]
Description=Smart Energy AI Engine
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/Smart_AI_Based_Energy-Meter
ExecStart=/usr/bin/python3 ai_engine_v2.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable & start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable ai-engine.service
sudo systemctl start ai-engine.service

# Check status
sudo systemctl status ai-engine.service

# View logs
sudo journalctl -u ai-engine.service -f
```

---

## Phase 3: AI Engine Features

### ✅ Module 1: Advanced Forecasting
- **ARIMA** (if statsmodels installed) - Time-series forecasting
- **Fallback**: Linear regression with exponential smoothing
- **Output**: 1-hour and 6-hour power consumption predictions

### ✅ Module 2: Hybrid Anomaly Detection
Combines three detection methods:
1. **Isolation Forest** (40% weight) - Detects multidimensional outliers
2. **Z-Score** (40% weight) - Statistical outliers
3. **Rate-of-Change** (20% weight) - Sudden spikes

Anomaly score: 0.0 = normal, 1.0 = definitely anomaly

### ✅ Module 3: Burn Rate & Depletion Predictor
- Current consumption rate (W/h)
- Hours until prepaid kWh balance depletes
- Based on 2-minute moving average

### ✅ Module 4: Load Classification
Automatic classification with advice:
- 0-100W: **Idle** (green)
- 100-500W: **Normal usage** (green)
- 500-1000W: **Moderate load** (amber)
- 1000-2000W: **Heavy load** (amber, red)
- 2000W+: **Critical/Spike** (red)

### ✅ Module 5: Synthetic Data Generation
Pre-seed Firebase with realistic energy profiles:
```bash
python ai_engine_v2.py --seed 14  # 14 days of data
```

---

## Phase 4: Firebase RTDB Structure (What AI Writes)

The AI engine writes to `/ai_output`:
```json
{
  "prediction_1h": 520.5,           // Watts next 1 hour
  "prediction_6h": 480.3,           // Watts next 6 hours
  "anomaly": false,                 // Boolean
  "anomaly_score": 0.15,            // 0.0-1.0
  "burn_rate_wph": 450.2,           // Watts/hour
  "depletion_hours": 124.5,         // Hours until units run out
  "baseline_mean": 445.2,           // Average power
  "classification": "Normal usage",  // String
  "advice": "Consumption within normal range.",
  "data_points": 720,               // Samples in buffer
  "updated": 1685923400000,         // Timestamp ms
  "model_version": "v2_advanced"
}
```

---

## Phase 5: Monitoring & Logs

### Real-Time Log Monitoring
```bash
# Watch logs live
tail -f ai_engine.log

# Or with timestamps
tail -f ai_engine.log | grep "\[AI\]"
```

### Log File Location
```
./ai_engine.log  (in project directory)
```

### Troubleshooting

**Problem: "AI_FIREBASE_SECRET not set in .env"**
- Solution: Check your .env file has `AI_FIREBASE_SECRET` with correct value

**Problem: "Failed to GET /live after 3 retries"**
- Solution: Check Firebase connection, verify `AI_FIREBASE_URL` is correct

**Problem: "Warning: statsmodels not installed"**
- Solution: `pip install statsmodels==0.14.0` for ARIMA forecasting

**Problem: Keeps writing "No live data from Firebase"**
- Solution: Check if ESP32 is connected and pushing data to `/live`

---

## Next Steps

1. ✅ **AI Engine**: Running on Raspberry Pi or local PC
2. ⏳ **React Dashboard**: Next phase - displays AI predictions
3. ⏳ **ESP32 Firmware**: Reads sensor, pushes `/live` data
4. ⏳ **Mobile App**: React Native or Flutter

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `python ai_engine_v2.py` | Run AI engine |
| `python ai_engine_v2.py --seed 7` | Pre-populate Firebase |
| `tail -f ai_engine.log` | View logs |
| `pip install -r requirements.txt` | Install deps |

---

**Questions?** Check the Firebase console `/ai_output` node to see live predictions!
