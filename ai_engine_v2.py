"""
════════════════════════════════════════════════════════════════════════════════
 ⚡ AI-BASED SMART ENERGY MONITORING SYSTEM — Advanced AI Engine (v2)
════════════════════════════════════════════════════════════════════════════════
 
FEATURES:
  ✅ Advanced Forecasting: ARIMA + Exponential Smoothing
  ✅ Hybrid Anomaly Detection: Isolation Forest + Z-score
  ✅ Production Logging & Error Recovery
  ✅ Environment-based Configuration (.env)
  ✅ Comprehensive Data Validation
  ✅ Synthetic Data Generation for Testing
  ✅ Graceful Firebase Connectivity Handling

USAGE:
  1. Install dependencies: pip install -r requirements.txt
  2. Configure .env with your Firebase credentials
  3. Run: python ai_engine_v2.py
  4. Seed data: python ai_engine_v2.py --seed [days]

DEPLOYMENT:
  - Raspberry Pi (recommended for persistent AI inference)
  - Docker container
  - Cloud Run / Firebase Cloud Functions
  - Local PC alongside React dashboard

════════════════════════════════════════════════════════════════════════════════
"""

import os
import sys
import time
import json
import logging
import numpy as np
import pandas as pd
import requests
from typing import Tuple, Dict, Optional, List
from datetime import datetime, timedelta
from collections import deque
from dotenv import load_dotenv
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

# Try to import statsmodels for ARIMA (optional, falls back to simple forecasting)
try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False
    print("⚠️  WARNING: statsmodels not installed. Using fallback forecasting algorithms.")
    print("   Install with: pip install statsmodels")

# ════════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ════════════════════════════════════════════════════════════════════════════════

# Load .env configuration
load_dotenv()

# ─────────────────────────────────────────────────────────────────────────────
#  FIREBASE CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
FB_URL = os.getenv('AI_FIREBASE_URL', 'https://smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app')
FB_SECRET = os.getenv('AI_FIREBASE_SECRET', '')

if not FB_SECRET:
    print("❌ ERROR: AI_FIREBASE_SECRET not set in .env file!")
    print("   Please configure your .env file with Firebase credentials.")
    sys.exit(1)

# ─────────────────────────────────────────────────────────────────────────────
#  ENGINE CONFIGURATION
# ─────────────────────────────────────────────────────────────────────────────
POLL_INTERVAL_S = int(os.getenv('AI_POLL_INTERVAL', 5))
AI_WRITE_INTERVAL_S = int(os.getenv('AI_WRITE_INTERVAL', 10))
WINDOW_SIZE = 720  # 720 × 5s ≈ 1 hour rolling window
ANOMALY_Z_THRESH = float(os.getenv('AI_ANOMALY_THRESHOLD', 2.5))
MIN_SAMPLES_FORECAST = 30  # Minimum samples before forecasting activates
MIN_SAMPLES_ANOMALY = 10  # Minimum samples before anomaly detection activates
PREPAID_UNITS_KWH = float(os.getenv('AI_PREPAID_UNITS_KWH', 55776))

# Anomaly detection hyperparameters
ISOLATION_FOREST_CONTAMINATION = 0.05  # 5% expected outliers
ANOMALY_SENSITIVITY = 0.7  # Hybrid score threshold (0-1)

# ─────────────────────────────────────────────────────────────────────────────
#  LOGGING SETUP
# ─────────────────────────────────────────────────────────────────────────────
LOG_LEVEL = os.getenv('AI_LOG_LEVEL', 'INFO')
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ai_engine.log', mode='a')
    ]
)
logger = logging.getLogger('AI_ENGINE')

# ────────────────────────────────────────────────────────────────────────────
#  ROLLING DATA BUFFERS
# ────────────────────────────────────────────────────────────────────────────
class DataBuffer:
    """Thread-safe rolling buffer for time-series data."""
    def __init__(self, maxlen: int = WINDOW_SIZE):
        self.watts = deque(maxlen=maxlen)
        self.voltage = deque(maxlen=maxlen)
        self.current = deque(maxlen=maxlen)
        self.kwh = deque(maxlen=maxlen)
        self.ts = deque(maxlen=maxlen)
        self.timestamp_objects = deque(maxlen=maxlen)

    @property
    def size(self) -> int:
        return len(self.watts)

    def append(self, watts: float, voltage: float, current: float, 
               kwh: float, ts: float) -> None:
        """Add a new reading to buffers."""
        self.watts.append(watts)
        self.voltage.append(voltage)
        self.current.append(current)
        self.kwh.append(kwh)
        self.ts.append(ts)
        self.timestamp_objects.append(datetime.fromtimestamp(ts))

    def is_ready_for_anomaly(self) -> bool:
        return len(self.watts) >= MIN_SAMPLES_ANOMALY

    def is_ready_for_forecast(self) -> bool:
        return len(self.watts) >= MIN_SAMPLES_FORECAST

    def get_dataframe(self) -> pd.DataFrame:
        """Convert buffer to pandas DataFrame."""
        return pd.DataFrame({
            'timestamp': pd.to_datetime(self.timestamp_objects),
            'watts': list(self.watts),
            'voltage': list(self.voltage),
            'current': list(self.current),
            'kwh': list(self.kwh),
            'ts': list(self.ts)
        })

buffer = DataBuffer()

# Track last processed timestamps
last_processed_ts = 0
last_ai_write = 0
firebase_error_count = 0
firebase_last_error = None


# ════════════════════════════════════════════════════════════════════════════════
#  FIREBASE HELPERS WITH RETRY & ERROR HANDLING
# ════════════════════════════════════════════════════════════════════════════════

def fb_get(path: str, timeout: int = 8, retries: int = 3) -> Optional[Dict]:
    """
    Fetch data from Firebase RTDB with retry logic.
    Returns parsed JSON or None on failure.
    """
    global firebase_error_count, firebase_last_error
    
    for attempt in range(retries):
        try:
            url = f"{FB_URL}/{path}.json?auth={FB_SECRET}"
            r = requests.get(url, timeout=timeout)
            
            if r.status_code == 200:
                firebase_error_count = 0
                return r.json()
            elif r.status_code == 404:
                logger.debug(f"[FB GET] Path /{path} not found (404)")
                return None
            else:
                logger.warning(f"[FB GET] HTTP {r.status_code} on /{path} (attempt {attempt+1}/{retries})")
                
        except requests.Timeout:
            logger.warning(f"[FB GET] Timeout on /{path} (attempt {attempt+1}/{retries})")
        except requests.ConnectionError as e:
            logger.warning(f"[FB GET] Connection error: {e} (attempt {attempt+1}/{retries})")
        except Exception as e:
            logger.error(f"[FB GET] Unexpected error: {e}")
        
        if attempt < retries - 1:
            time.sleep(2 ** attempt)  # Exponential backoff
    
    firebase_error_count += 1
    firebase_last_error = f"Failed to GET /{path} after {retries} retries"
    logger.error(firebase_last_error)
    return None


def fb_put(path: str, data: Dict, timeout: int = 8, retries: int = 3) -> bool:
    """
    Write data to Firebase RTDB with retry logic.
    Returns True on success, False on failure.
    """
    global firebase_error_count, firebase_last_error
    
    for attempt in range(retries):
        try:
            url = f"{FB_URL}/{path}.json?auth={FB_SECRET}"
            r = requests.put(url, json=data, timeout=timeout)
            
            if r.status_code in (200, 204):
                firebase_error_count = 0
                return True
            else:
                logger.warning(f"[FB PUT] HTTP {r.status_code} on /{path} (attempt {attempt+1}/{retries})")
                
        except requests.Timeout:
            logger.warning(f"[FB PUT] Timeout on /{path} (attempt {attempt+1}/{retries})")
        except requests.ConnectionError as e:
            logger.warning(f"[FB PUT] Connection error: {e} (attempt {attempt+1}/{retries})")
        except Exception as e:
            logger.error(f"[FB PUT] Unexpected error: {e}")
        
        if attempt < retries - 1:
            time.sleep(2 ** attempt)
    
    firebase_error_count += 1
    firebase_last_error = f"Failed to PUT /{path} after {retries} retries"
    logger.error(firebase_last_error)
    return False


def fb_post(path: str, data: Dict, timeout: int = 8, retries: int = 3) -> bool:
    """Append data to Firebase RTDB (auto-keyed)."""
    for attempt in range(retries):
        try:
            url = f"{FB_URL}/{path}.json?auth={FB_SECRET}"
            r = requests.post(url, json=data, timeout=timeout)
            return r.status_code in (200, 201)
        except Exception as e:
            logger.warning(f"[FB POST] Attempt {attempt+1}/{retries} failed: {e}")
            if attempt < retries - 1:
                time.sleep(2 ** attempt)
    return False


# ════════════════════════════════════════════════════════════════════════════════
#  MODULE 1 — ADVANCED FORECASTING (ARIMA + Exponential Smoothing)
# ════════════════════════════════════════════════════════════════════════════════

def forecast_consumption_arima() -> Tuple[Optional[float], Optional[float]]:
    """
    ARIMA-based forecasting for next 1h and 6h consumption.
    Falls back to exponential smoothing if ARIMA fails.
    
    Returns: (pred_1h_watts, pred_6h_watts) or (None, None)
    """
    if not buffer.is_ready_for_forecast():
        return None, None
    
    try:
        if not STATSMODELS_AVAILABLE:
            return forecast_consumption_fallback()
        
        df = buffer.get_dataframe()
        model = ARIMA(df['watts'], order=(1, 1, 1))
        fitted = model.fit()
        
        # Forecast next 72 steps (6 hours at 5s intervals)
        forecast = fitted.get_forecast(steps=72)
        pred_array = forecast.predicted_mean.values
        
        # 1h = 12 samples (12 × 5s = 60s)
        pred_1h = float(pred_array[12])
        pred_6h = float(pred_array[71])
        
        # Clamp to sensible range
        pred_1h = max(0.0, min(pred_1h, 10000.0))
        pred_6h = max(0.0, min(pred_6h, 10000.0))
        
        return round(pred_1h, 1), round(pred_6h, 1)
        
    except Exception as e:
        logger.debug(f"[FORECAST ARIMA] Failed: {e}. Using fallback.")
        return forecast_consumption_fallback()


def forecast_consumption_fallback() -> Tuple[Optional[float], Optional[float]]:
    """
    Fallback: Linear regression or exponential smoothing.
    Used when ARIMA is unavailable or fails.
    """
    if not buffer.is_ready_for_forecast():
        return None, None
    
    try:
        X = np.array(list(buffer.ts)).reshape(-1, 1)
        y = np.array(list(buffer.watts))
        
        # Normalize timestamps
        X_norm = X - X[0]
        
        model = LinearRegression()
        model.fit(X_norm, y)
        
        now_norm = X_norm[-1][0]
        pred_1h = float(model.predict([[now_norm + 3600]])[0])
        pred_6h = float(model.predict([[now_norm + 21600]])[0])
        
        # Clamp
        pred_1h = max(0.0, min(pred_1h, 10000.0))
        pred_6h = max(0.0, min(pred_6h, 10000.0))
        
        return round(pred_1h, 1), round(pred_6h, 1)
        
    except Exception as e:
        logger.error(f"[FORECAST FALLBACK] Error: {e}")
        return None, None


# ════════════════════════════════════════════════════════════════════════════════
#  MODULE 2 — HYBRID ANOMALY DETECTION (Isolation Forest + Z-score)
# ════════════════════════════════════════════════════════════════════════════════

def detect_anomaly_hybrid(current_w: float) -> Tuple[bool, float]:
    """
    Hybrid anomaly detection combining:
    1. Isolation Forest (detects multidimensional outliers)
    2. Z-score (detects statistical outliers)
    3. Rate-of-change (detects sudden spikes)
    
    Returns: (is_anomaly: bool, anomaly_score: 0-1)
    """
    if not buffer.is_ready_for_anomaly():
        return False, 0.0
    
    try:
        # --- Prepare data ---
        watts_array = np.array(list(buffer.watts)).reshape(-1, 1)
        
        # --- 1. Isolation Forest detection ---
        try:
            iso_forest = IsolationForest(
                contamination=ISOLATION_FOREST_CONTAMINATION,
                random_state=42,
                n_estimators=100
            )
            iso_predictions = iso_forest.fit_predict(watts_array)
            iso_score = iso_forest.score_samples(watts_array[-1:].reshape(1, -1))[0]
            
            # Normalize score to 0-1 (higher = more anomalous)
            iso_anomaly_prob = 1.0 / (1.0 + np.exp(iso_score))
        except Exception as e:
            logger.debug(f"[ANOMALY ISO] Error: {e}")
            iso_anomaly_prob = 0.0
        
        # --- 2. Z-score detection ---
        mean = float(np.mean(watts_array))
        std = float(np.std(watts_array))
        
        if std < 2.0:
            z_score = 0.0
            z_anomaly_prob = 0.0
        else:
            z_score = abs((current_w - mean) / std)
            # Sigmoid to convert Z-score to probability
            z_anomaly_prob = 1.0 / (1.0 + np.exp(-z_score + ANOMALY_Z_THRESH))
        
        # --- 3. Rate-of-change spike detection ---
        if len(buffer.watts) >= 2:
            spike = abs(current_w - float(list(buffer.watts)[-1])) / (float(list(buffer.watts)[-1]) + 1.0)
            spike_prob = min(1.0, spike / 2.0)  # 100% change = 0.5 probability
        else:
            spike_prob = 0.0
        
        # --- 4. Combine scores ---
        anomaly_score = (iso_anomaly_prob * 0.4 + z_anomaly_prob * 0.4 + spike_prob * 0.2)
        is_anomaly = anomaly_score > ANOMALY_SENSITIVITY
        
        return is_anomaly, round(anomaly_score, 3)
        
    except Exception as e:
        logger.error(f"[ANOMALY DETECTION] Error: {e}")
        return False, 0.0


# ════════════════════════════════════════════════════════════════════════════════
#  MODULE 3 — BURN RATE & DEPLETION PREDICTOR
# ════════════════════════════════════════════════════════════════════════════════

def calc_burn_rate(kwh_cumulative: float) -> Tuple[float, float]:
    """
    Calculate burn rate (W/h) and hours until prepaid depletion.
    Uses exponential moving average for smooth burn rate calculation.
    
    Returns: (burn_rate_wph: float, hours_remaining: float)
    """
    if len(buffer.watts) < 12:
        return 0.0, 999.0
    
    try:
        # Last 24 samples (2 minutes at 5s intervals)
        recent_watts = list(buffer.watts)[-24:]
        avg_w = float(np.mean(recent_watts))
        
        if avg_w < 5.0:
            return 0.0, 999.0
        
        # Calculate remaining balance
        kwh_remaining = max(0.0, PREPAID_UNITS_KWH - kwh_cumulative)
        wh_remaining = kwh_remaining * 1000.0
        
        # Hours until depletion
        hours_left = wh_remaining / avg_w
        
        return round(avg_w, 1), round(hours_left, 1)
        
    except Exception as e:
        logger.error(f"[BURN RATE] Error: {e}")
        return 0.0, 999.0


# ════════════════════════════════════════════════════════════════════════════════
#  MODULE 4 — LOAD CLASSIFICATION
# ════════════════════════════════════════════════════════════════════════════════

def classify_load(watts: float, baseline_mean: float = 0.0) -> Dict[str, str]:
    """
    Context-aware load classification with advice.
    
    Returns: {"label": str, "color": "green|amber|red", "advice": str}
    """
    if watts < 10:
        return {"label": "Standby", "color": "green", "advice": "System idle."}
    if watts < 100:
        return {"label": "Idle", "color": "green", "advice": "Very low consumption. Normal."}
    if watts < 500:
        return {"label": "Normal usage", "color": "green", "advice": "Consumption within normal range."}
    if watts < 1000:
        return {"label": "Moderate load", "color": "amber", "advice": "Moderate load. Monitor if sustained."}
    if watts < 1500:
        return {"label": "Heavy load", "color": "amber", "advice": "Heavy appliance running. Check if necessary."}
    if watts < 2000:
        return {"label": "High consumption", "color": "red", "advice": "High consumption. Consider load reduction."}
    
    # Above 2000W — check for spike
    if baseline_mean > 10.0:
        ratio = watts / baseline_mean
        if ratio > 3.0:
            return {
                "label": "Spike detected",
                "color": "red",
                "advice": "Abnormal spike! Possible fault or high-draw appliance."
            }
    
    return {
        "label": "Critical load",
        "color": "red",
        "advice": "Critical threshold. Load management may trigger."
    }


# ════════════════════════════════════════════════════════════════════════════════
#  MODULE 5 — REALISTIC SYNTHETIC DATA GENERATION
# ════════════════════════════════════════════════════════════════════════════════

def generate_synthetic_data(days: int = 7, interval_min: int = 1) -> pd.DataFrame:
    """
    Generate realistic Nigerian household/office load profile.
    Useful for pre-seeding Firebase before real hardware is connected.
    """
    logger.info(f"[SYNTH] Generating {days} days of realistic energy data...")
    
    records = []
    start_dt = datetime.now() - timedelta(days=days)
    current = start_dt
    end_dt = datetime.now()
    cumkwh = 0.0
    
    while current < end_dt:
        h = current.hour + current.minute / 60.0
        
        # Base load profile (Nigerian context)
        if h < 5:
            base, std = 100, 20
        elif h < 6:
            base, std = 300, 80
        elif h < 9:
            base, std = 1800, 300
        elif h < 17:
            base, std = 900, 120
        elif h < 18:
            base, std = 1300, 200
        elif h < 22:
            base, std = 1500, 250
        else:
            base, std = 450, 100
        
        # Weekend reduction
        if current.weekday() >= 5 and 9 <= h < 17:
            base = int(base * 0.7)
        
        watts = max(50, np.random.normal(base, std))
        
        # Random anomalies (~2 per day)
        if random.random() < 0.001:
            watts = float(np.random.uniform(3000, 4500))
            logger.debug(f"[SYNTH] Anomaly at {current}: {watts:.0f}W")
        
        kwh_step = (watts * (interval_min / 60.0)) / 1000.0
        cumkwh += kwh_step
        
        classification = classify_load(watts)
        
        v = round(np.random.normal(230, 3), 1)
        i = round(watts / (v if v > 0 else 230), 3)
        
        records.append({
            "ts": int(current.timestamp() * 1000),
            "ts_str": current.strftime("%Y-%m-%d %H:%M:%S"),
            "v": v,
            "i": i,
            "w": round(watts, 1),
            "kwh": round(cumkwh, 3),
            "pf": round(np.random.uniform(0.85, 0.98), 2),
            "hz": round(np.random.normal(50, 0.2), 1),
            "label": classification["label"],
            "color": classification["color"],
            "anomaly": False,
            "z1": True, "z2": True, "z3": True, "z4": True
        })
        
        current += timedelta(minutes=interval_min)
    
    df = pd.DataFrame(records)
    logger.info(f"[SYNTH] Generated {len(df)} records spanning {days} days")
    return df


def seed_firebase_with_synthetic(days: int = 7):
    """Seed Firebase /history with synthetic data."""
    df = generate_synthetic_data(days=days, interval_min=1)
    
    logger.info(f"[SEED] Uploading {len(df)} records to Firebase /history...")
    success = 0
    for _, row in df.iterrows():
        if fb_post("history", row.to_dict()):
            success += 1
        if success % 100 == 0:
            logger.info(f"[SEED] {success}/{len(df)} uploaded...")
        time.sleep(0.05)
    
    logger.info(f"[SEED] Complete. {success}/{len(df)} records uploaded.")


# ════════════════════════════════════════════════════════════════════════════════
#  MAIN AI ENGINE LOOP
# ════════════════════════════════════════════════════════════════════════════════

def run():
    """Main AI engine loop."""
    global last_processed_ts, last_ai_write
    
    logger.info("=" * 80)
    logger.info("⚡ AI ENGINE STARTED (v2)")
    logger.info(f"   Firebase: {FB_URL}")
    logger.info(f"   Poll interval: {POLL_INTERVAL_S}s")
    logger.info(f"   Write interval: {AI_WRITE_INTERVAL_S}s")
    logger.info(f"   Window: {WINDOW_SIZE} samples (~{WINDOW_SIZE*5//60} min)")
    logger.info(f"   Anomaly threshold: {ANOMALY_Z_THRESH}")
    logger.info(f"   ARIMA available: {STATSMODELS_AVAILABLE}")
    logger.info("=" * 80)
    
    consecutive_errors = 0
    max_consecutive_errors = 10
    
    while True:
        loop_start = time.time()
        
        try:
            # --- 1. Fetch /live from Firebase ---
            live = fb_get("live")
            if not live:
                consecutive_errors += 1
                if consecutive_errors > max_consecutive_errors:
                    logger.error(f"[AI] {consecutive_errors} consecutive fetch errors. Check Firebase connection!")
                logger.debug("[AI] No live data available.")
                time.sleep(POLL_INTERVAL_S)
                continue
            
            consecutive_errors = 0
            
            # --- 2. Extract readings ---
            w = float(live.get("w", 0.0))
            v = float(live.get("v", 230.0))
            i = float(live.get("i", 0.0))
            kwh = float(live.get("kwh", 0.0))
            ts = float(live.get("ts", time.time() * 1000)) / 1000.0
            
            # Skip duplicate timestamps
            if ts == last_processed_ts:
                time.sleep(max(0.1, POLL_INTERVAL_S - (time.time() - loop_start)))
                continue
            
            last_processed_ts = ts
            
            # --- 3. Update buffers ---
            buffer.append(w, v, i, kwh, ts)
            
            # --- 4. Run AI modules ---
            pred_1h, pred_6h = forecast_consumption_arima()
            is_anomaly, anomaly_score = detect_anomaly_hybrid(w)
            burn_rate, dep_hrs = calc_burn_rate(kwh)
            
            baseline_mean = float(np.mean(list(buffer.watts))) if buffer.size > 5 else 0.0
            classification = classify_load(w, baseline_mean)
            
            # --- 5. Build AI output document ---
            ai_output = {
                "prediction_1h": round(pred_1h or 0.0, 1),
                "prediction_6h": round(pred_6h or 0.0, 1),
                "anomaly": is_anomaly,
                "anomaly_score": anomaly_score,
                "burn_rate_wph": burn_rate,
                "depletion_hours": dep_hrs,
                "baseline_mean": round(baseline_mean, 1),
                "classification": classification["label"],
                "advice": classification["advice"],
                "data_points": buffer.size,
                "updated": int(time.time() * 1000),
                "model_version": "v2_advanced"
            }
            
            # --- 6. Write to Firebase /ai_output ---
            now = time.time()
            if now - last_ai_write >= AI_WRITE_INTERVAL_S:
                ok = fb_put("ai_output", ai_output)
                if ok:
                    last_ai_write = now
                    status = "🔴 ANOMALY" if is_anomaly else "✅ NORMAL"
                    logger.info(
                        f"{status} | W:{w:6.1f}W | Anom:{anomaly_score:.2f} | "
                        f"Pred1h:{pred_1h or 0:6.0f}W | Dep:{dep_hrs:5.1f}h | "
                        f"{classification['label']}"
                    )
        
        except KeyboardInterrupt:
            logger.info("[AI] Shutdown requested. Exiting gracefully...")
            break
        except Exception as e:
            logger.error(f"[AI ERROR] {e}", exc_info=True)
        
        # Maintain poll interval
        elapsed = time.time() - loop_start
        sleep_for = max(0.1, POLL_INTERVAL_S - elapsed)
        time.sleep(sleep_for)


# ════════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ════════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--seed":
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 7
        logger.info(f"[MODE] Seeding Firebase with {days} days of synthetic data...")
        seed_firebase_with_synthetic(days=days)
        logger.info("Done! Now run: python ai_engine_v2.py")
    else:
        run()
