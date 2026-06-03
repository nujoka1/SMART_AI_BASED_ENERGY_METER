"""
================================================================
 AI-BASED SMART ENERGY MONITORING SYSTEM
 Block 2 — Python AI Engine
================================================================
 Runs on your laptop / Raspberry Pi alongside the dashboard.
 Connects to Firebase RTDB, reads live data, writes AI outputs.

 Install dependencies:
   pip install requests numpy scikit-learn pandas

 Run:
   python ai_engine.py

 What this engine does:
   Module 1 — Linear regression consumption forecaster
   Module 2 — Z-score rolling anomaly detector
   Module 3 — Burn rate & prepaid unit depletion predictor
   Module 4 — Realistic synthetic data generator (for seeding)
   Module 5 — Classification consistency checker
================================================================
"""

import time
import json
import math
import random
import requests
import numpy  as np
import pandas as pd
from collections import deque
from datetime    import datetime, timedelta
from sklearn.linear_model import LinearRegression

# ─────────────────────────────────────────────
#  FIREBASE CONFIG  — match your ESP32 firmware
# ─────────────────────────────────────────────
import os

# Read Firebase settings from environment where possible. Keep hard-coded
# defaults only for quick local testing. For production, set AI_FIREBASE_URL
# and AI_FIREBASE_SECRET in your environment or CI secrets store.
FB_URL = os.getenv('AI_FIREBASE_URL', "https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app")
FB_SECRET = os.getenv('AI_FIREBASE_SECRET', "5d1073f7a8884d5345a44b2349800eab769a961d")

# ─────────────────────────────────────────────
#  ENGINE CONFIG
# ─────────────────────────────────────────────
POLL_INTERVAL_S  = 5       # read /live every 5 seconds
AI_WRITE_INTERVAL_S = 10   # write /ai_output every 10 seconds
WINDOW_SIZE      = 720     # 720 × 5s = 1 hour rolling window
ANOMALY_Z_THRESH = 2.5     # Z-score threshold
MIN_SAMPLES_LR   = 30      # minimum samples before regression runs
PREPAID_UNITS_KWH = 55776   # set your starting prepaid balance here

# ─────────────────────────────────────────────
#  ROLLING DATA BUFFERS
# ─────────────────────────────────────────────
watts_buf    = deque(maxlen=WINDOW_SIZE)
ts_buf       = deque(maxlen=WINDOW_SIZE)
kwh_buf      = deque(maxlen=WINDOW_SIZE)
label_buf    = deque(maxlen=WINDOW_SIZE)

# track last values to avoid duplicate processing
last_ts      = 0
last_ai_write = 0


# ════════════════════════════════════════════
#  FIREBASE HELPERS
# ════════════════════════════════════════════

def fb_get(path: str) -> dict | None:
    """GET a Firebase RTDB node. Returns parsed JSON or None."""
    try:
        url = f"{FB_URL}/{path}.json?auth={FB_SECRET}"
        r   = requests.get(url, timeout=8)
        if r.status_code == 200:
            return r.json()
        print(f"[FB GET] Error {r.status_code} on /{path}")
        return None
    except Exception as e:
        print(f"[FB GET] Exception: {e}")
        return None


def fb_put(path: str, data: dict) -> bool:
    """PUT (overwrite) a Firebase RTDB node."""
    try:
        url = f"{FB_URL}/{path}.json?auth={FB_SECRET}"
        r   = requests.put(url, json=data, timeout=8)
        return r.status_code in (200, 204)
    except Exception as e:
        print(f"[FB PUT] Exception: {e}")
        return False


def fb_post(path: str, data: dict) -> bool:
    """POST (append with auto-key) to a Firebase RTDB node."""
    try:
        url = f"{FB_URL}/{path}.json?auth={FB_SECRET}"
        r   = requests.post(url, json=data, timeout=8)
        return r.status_code in (200, 204)
    except Exception as e:
        print(f"[FB POST] Exception: {e}")
        return False


# ════════════════════════════════════════════
#  MODULE 1 — LINEAR REGRESSION FORECASTER
#  Trains on rolling window of wattage data.
#  Predicts average power for next 1h and 6h.
# ════════════════════════════════════════════

def forecast_consumption() -> tuple[float | None, float | None]:
    """
    Returns (pred_1h_watts, pred_6h_watts) or (None, None)
    if insufficient data.
    """
    if len(watts_buf) < MIN_SAMPLES_LR:
        return None, None

    try:
        X = np.array(list(ts_buf)).reshape(-1, 1)
        y = np.array(list(watts_buf))

        # Normalise timestamps to avoid numerical overflow
        X_norm = X - X[0]

        model = LinearRegression()
        model.fit(X_norm, y)

        now_norm  = X_norm[-1][0]
        pred_1h   = float(model.predict([[now_norm + 3600]])[0])
        pred_6h   = float(model.predict([[now_norm + 21600]])[0])

        # Clamp to sensible range (no negative power)
        pred_1h = max(0.0, min(pred_1h, 10000.0))
        pred_6h = max(0.0, min(pred_6h, 10000.0))

        return round(pred_1h, 1), round(pred_6h, 1)

    except Exception as e:
        print(f"[FORECAST] Error: {e}")
        return None, None


# ════════════════════════════════════════════
#  MODULE 2 — Z-SCORE ANOMALY DETECTOR
#  No training required. Self-calibrates.
#  Uses rolling mean and std deviation.
# ════════════════════════════════════════════

def detect_anomaly(current_w: float) -> tuple[bool, float]:
    """
    Returns (is_anomaly: bool, z_score: float).
    Needs at least 10 samples to activate.
    """
    if len(watts_buf) < 10:
        return False, 0.0

    try:
        arr  = np.array(list(watts_buf))
        mean = float(np.mean(arr))
        std  = float(np.std(arr))

        # Avoid division by near-zero std (flat consumption = no anomaly)
        if std < 2.0:
            return False, 0.0

        z = abs((current_w - mean) / std)
        is_anomaly = z > ANOMALY_Z_THRESH

        return is_anomaly, round(z, 3)

    except Exception as e:
        print(f"[ANOMALY] Error: {e}")
        return False, 0.0


# ════════════════════════════════════════════
#  MODULE 3 — BURN RATE & DEPLETION PREDICTOR
#  Computes how fast kWh units are depleting.
#  Projects time until prepaid balance runs out.
# ════════════════════════════════════════════

def calc_burn_rate(kwh_cumulative: float) -> tuple[float, float]:
    """
    Returns (burn_rate_wph: float, hours_remaining: float).
    burn_rate_wph = average watts over last 10 minutes.
    hours_remaining based on current prepaid balance minus kwh used.
    """
    if len(watts_buf) < 12:
        return 0.0, 999.0

    try:
        # Last 2 minutes of readings (24 samples × 5s)
        recent_w  = list(watts_buf)[-24:]
        avg_w     = float(np.mean(recent_w))

        # Wh/hour = average watts (by definition)
        burn_wph  = avg_w

        if burn_wph < 5.0:
            return 0.0, 999.0

        # Remaining prepaid balance
        kwh_used      = kwh_cumulative
        kwh_remaining = max(0.0, PREPAID_UNITS_KWH - kwh_used)
        wh_remaining  = kwh_remaining * 1000.0

        hours_left = wh_remaining / burn_wph

        return round(burn_wph, 1), round(hours_left, 1)

    except Exception as e:
        print(f"[BURN RATE] Error: {e}")
        return 0.0, 999.0


# ════════════════════════════════════════════
#  MODULE 4 — CLASSIFICATION CONSISTENCY
#  Mirrors the ESP32 classification logic in
#  Python so the AI can cross-validate labels.
# ════════════════════════════════════════════

def classify_load(watts: float, baseline_mean: float = 0.0) -> dict:
    """
    Returns classification dict with label, color, and advice.
    Context-aware: uses baseline_mean ratio for spike detection.
    """
    if watts < 10:
        return {"label": "Standby",          "color": "green",  "advice": "System is idle."}
    if watts < 100:
        return {"label": "Idle",             "color": "green",  "advice": "Very low consumption. Normal."}
    if watts < 500:
        return {"label": "Normal usage",     "color": "green",  "advice": "Consumption within normal range."}
    if watts < 1000:
        return {"label": "Moderate load",    "color": "amber",  "advice": "Moderate load. Monitor if sustained."}
    if watts < 1500:
        return {"label": "Heavy load active","color": "amber",  "advice": "Heavy appliance running. Check if necessary."}
    if watts < 2000:
        return {"label": "High consumption", "color": "red",    "advice": "High consumption. Consider load reduction."}

    # Above 2000W — check spike ratio
    if baseline_mean > 10.0:
        ratio = watts / baseline_mean
        if ratio > 3.0:
            return {"label": "Spike detected",    "color": "red", "advice": "Abnormal spike. Possible fault or high-draw appliance."}

    return {"label": "Critical threshold", "color": "red", "advice": "Critical load. Auto-management may trigger."}


# ════════════════════════════════════════════
#  MODULE 5 — REALISTIC SYNTHETIC DATA
#  Generates a realistic Nigerian household/
#  office load profile for pre-seeding Firebase.
#  Use ONCE to fill 7 days of history data
#  before real sensor data arrives.
# ════════════════════════════════════════════

def generate_synthetic_data(days: int = 7, interval_min: int = 1) -> pd.DataFrame:
    """
    Generates `days` days of realistic energy data at
    `interval_min` minute intervals.

    Load profile (Nigerian office/household):
      00:00 – 05:00  Night idle       ~80–120W
      05:00 – 06:00  Morning ramp     ~200–400W
      06:00 – 09:00  Morning peak     ~1400–2200W (kettle, AC, water heater)
      09:00 – 17:00  Office plateau   ~700–1100W  (computers, AC, lighting)
      17:00 – 18:00  Evening ramp     ~1000–1500W
      18:00 – 22:00  Evening peak     ~1200–1800W (cooking, TV, AC)
      22:00 – 00:00  Night wind-down  ~300–600W
    """
    print(f"[SYNTH] Generating {days} days of synthetic data...")

    records  = []
    start_dt = datetime.now() - timedelta(days=days)
    current  = start_dt
    end_dt   = datetime.now()
    cumkwh   = 0.0

    while current < end_dt:
        h = current.hour + current.minute / 60.0

        # Base wattage by hour
        if   h <  5:  base, std = 100,  20
        elif h <  6:  base, std = 300,  80
        elif h <  9:  base, std = 1800, 300
        elif h < 17:  base, std = 900,  120
        elif h < 18:  base, std = 1300, 200
        elif h < 22:  base, std = 1500, 250
        else:         base, std = 450,  100

        # Weekend effect: 30% lower office load
        if current.weekday() >= 5:
            if 9 <= h < 17:
                base = int(base * 0.7)

        watts = max(50, np.random.normal(base, std))

        # Inject random anomaly events (~2 per day)
        if random.random() < 0.001:
            watts = float(np.random.uniform(3000, 4500))
            print(f"[SYNTH] Anomaly injected at {current.strftime('%Y-%m-%d %H:%M')}: {watts:.0f}W")

        # Cumulative energy (kWh)
        kwh_this_step = (watts * (interval_min / 60.0)) / 1000.0
        cumkwh       += kwh_this_step

        classification = classify_load(watts)

        records.append({
            "ts":      int(current.timestamp() * 1000),
            "ts_str":  current.strftime("%Y-%m-%d %H:%M:%S"),
            "v":       round(np.random.normal(230, 3), 1),
            "i":       round(watts / 230.0, 3),
            "w":       round(watts, 1),
            "kwh":     round(cumkwh, 3),
            "pf":      round(np.random.uniform(0.85, 0.98), 2),
            "hz":      round(np.random.normal(50, 0.2), 1),
            "label":   classification["label"],
            "color":   classification["color"],
            "anomaly": False,
            "z1": True, "z2": True, "z3": True, "z4": True
        })

        current += timedelta(minutes=interval_min)

    df = pd.DataFrame(records)
    print(f"[SYNTH] Generated {len(df)} records spanning {days} days")
    return df


def seed_firebase_with_synthetic(days: int = 7):
    """
    Pushes synthetic data to Firebase /history.
    Run this once before deploying hardware.
    WARNING: This will add ~10,080 records to /history.
    Only call this if you want to pre-populate charts.
    """
    df = generate_synthetic_data(days=days, interval_min=1)

    print(f"[SEED] Uploading {len(df)} records to Firebase /history...")
    success = 0
    for _, row in df.iterrows():
        record = row.to_dict()
        if fb_post("history", record):
            success += 1
        if success % 100 == 0:
            print(f"[SEED] {success}/{len(df)} uploaded...")
        time.sleep(0.05)   # rate limit Firebase writes

    print(f"[SEED] Complete. {success}/{len(df)} records uploaded.")


# ════════════════════════════════════════════
#  MAIN AI ENGINE LOOP
# ════════════════════════════════════════════

def run():
    print("=" * 50)
    print(" AI ENGINE STARTED")
    print(f" Firebase: {FB_URL}")
    print(f" Window: {WINDOW_SIZE} samples ({WINDOW_SIZE*5//60} min)")
    print(f" Z-threshold: {ANOMALY_Z_THRESH}")
    print("=" * 50)

    global last_ts, last_ai_write

    while True:
        loop_start = time.time()

        try:
            # ── 1. Read /live from Firebase ──────
            live = fb_get("live")
            if not live:
                print("[AI] No live data from Firebase — waiting...")
                time.sleep(POLL_INTERVAL_S)
                continue

            w   = float(live.get("w",   0.0))
            kwh = float(live.get("kwh", 0.0))
            ts  = float(live.get("ts",  time.time() * 1000)) / 1000.0

            # Skip if same timestamp as last read
            if ts == last_ts:
                time.sleep(POLL_INTERVAL_S)
                continue
            last_ts = ts

            # ── 2. Update buffers ─────────────────
            watts_buf.append(w)
            ts_buf.append(ts)
            kwh_buf.append(kwh)

            # ── 3. Run all AI modules ─────────────
            pred_1h, pred_6h   = forecast_consumption()
            is_anomaly, z_score = detect_anomaly(w)
            burn_rate, dep_hrs  = calc_burn_rate(kwh)

            baseline_mean = float(np.mean(list(watts_buf))) if len(watts_buf) > 5 else 0.0
            classification = classify_load(w, baseline_mean)

            # ── 4. Build AI output document ───────
            ai_output = {
                "prediction_1h":    pred_1h  if pred_1h  is not None else 0.0,
                "prediction_6h":    pred_6h  if pred_6h  is not None else 0.0,
                "anomaly":          is_anomaly,
                "anomaly_score":    z_score,
                "burn_rate_wph":    burn_rate,
                "depletion_hours":  dep_hrs,
                "baseline_mean":    round(baseline_mean, 1),
                "classification":   classification["label"],
                "advice":           classification["advice"],
                "data_points":      len(watts_buf),
                "updated":          int(time.time() * 1000)
            }

            # ── 5. Write to Firebase /ai_output ───
            now = time.time()
            if now - last_ai_write >= AI_WRITE_INTERVAL_S:
                ok = fb_put("ai_output", ai_output)
                last_ai_write = now

                status_str = "ANOMALY" if is_anomaly else "OK"
                print(
                    f"[AI] W:{w:6.1f}W | Z:{z_score:.2f} {status_str:8s} | "
                    f"Pred1h:{pred_1h or 0:6.0f}W | "
                    f"Dep:{dep_hrs:5.1f}h | "
                    f"{classification['label']}"
                )

        except KeyboardInterrupt:
            print("\n[AI] Shutdown requested. Exiting.")
            break
        except Exception as e:
            print(f"[AI ERROR] {e}")

        # ── Maintain precise poll interval ────────
        elapsed = time.time() - loop_start
        sleep_for = max(0.1, POLL_INTERVAL_S - elapsed)
        time.sleep(sleep_for)


# ════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════

if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "--seed":
        # python ai_engine.py --seed
        # Run this ONCE to pre-populate Firebase with 7 days of data
        print("[MODE] Seeding Firebase with 7 days of synthetic data...")
        seed_firebase_with_synthetic(days=7)
        print("[MODE] Seeding complete. Now run: python ai_engine.py")
    else:
        # Normal operation
        run()
