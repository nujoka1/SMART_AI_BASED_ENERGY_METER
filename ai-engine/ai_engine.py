import os
import time
from typing import Any, Dict

from dotenv import load_dotenv

from firebase_client import FirebaseClient
from anomaly_detector import analyze_reading
from billing import build_consumption_summary
from predictor import build_prediction


load_dotenv()


DEFAULT_SETTINGS = {
    "tariff_per_kwh": 0.0,
    "prepaid_units_kwh": 55776.0,

    "voltage_min_safe": 180.0,
    "voltage_max_safe": 250.0,
    "current_max_safe": 10.0,
    "power_max_safe": 2200.0,
    "power_factor_min_safe": 0.75,

    "poor_pf_min_power_w": 100.0,
    "anomaly_threshold": 2.5,

    "buzzer_enabled": True,
    "history_interval_s": 30,
}


class SmartEnergyAIEngine:
    def __init__(self):
        self.client = FirebaseClient()

        self.poll_interval = int(os.getenv("AI_POLL_INTERVAL", "5"))
        self.write_interval = int(os.getenv("AI_WRITE_INTERVAL", "10"))

        self.last_write_time = 0
        self.last_alert_type = None
        self.last_alert_time = 0

        print("=" * 70)
        print("SMART AI-BASED ENERGY METER - AI ENGINE")
        print("=" * 70)
        print(f"Device ID: {self.client.device_id}")
        print(f"Firebase: {self.client.base_url}")
        print(f"Poll interval: {self.poll_interval}s")
        print(f"Write interval: {self.write_interval}s")
        print("=" * 70)

    def ensure_default_settings(self) -> Dict[str, Any]:
        settings = self.client.get_settings()

        if settings:
            merged = dict(DEFAULT_SETTINGS)
            merged.update(settings)
            return merged

        print("[AI] No settings found. Writing default settings to Firebase.")
        self.client.put(f"/settings/{self.client.device_id}", DEFAULT_SETTINGS)

        return dict(DEFAULT_SETTINGS)

    def maybe_push_ai_alert(self, prediction: Dict[str, Any]) -> None:
        primary = prediction.get("primary_event", {})

        event_type = primary.get("type", "normal")
        level = primary.get("level", "info")
        message = primary.get("message", "")

        if event_type == "normal":
            return

        now = int(time.time())

        # Prevent repeating the same AI alert too often.
        if self.last_alert_type == event_type and now - self.last_alert_time < 120:
            return

        self.last_alert_type = event_type
        self.last_alert_time = now

        alert = {
            "level": level,
            "type": event_type,
            "source": "ai-engine",
            "message": message,
            "anomaly_score": prediction.get("anomaly_score", 0.0),
            "risk_level": prediction.get("risk_level", "low"),
            "acknowledged": False,
            "ts": now,
        }

        alert_id = self.client.push_alert(alert)

        if alert_id:
            print(f"[AI] Alert pushed: {event_type} ({alert_id})")

    def run_once(self) -> None:
        live = self.client.get_live()
        settings = self.ensure_default_settings()
        history = self.client.get_history(max_records=500)

        if not live:
            print("[AI] No live data yet. Waiting for ESP32 firmware upload...")
            return

        if not history:
            print("[AI] No history data yet. Using live snapshot only.")
            history = [live]

        anomaly_result = analyze_reading(live, history, settings)
        prediction = build_prediction(history, settings, anomaly_result)

        now = int(time.time())

        if now - self.last_write_time >= self.write_interval:
            self.last_write_time = now

            ok = self.client.write_ai_prediction(prediction)

            if ok:
                print(
                    "[AI] Prediction written | "
                    f"risk={prediction['risk_level']} | "
                    f"score={prediction['anomaly_score']} | "
                    f"daily={prediction['forecast_daily_kwh']}kWh | "
                    f"remaining={prediction['remaining_prepaid_units_kwh']}kWh"
                )

            for period in ["daily", "weekly", "monthly", "yearly"]:
                summary = build_consumption_summary(history, settings, period)
                self.client.write_summary(period, summary)

            print("[AI] Summaries written: daily, weekly, monthly, yearly")

            self.maybe_push_ai_alert(prediction)

    def run_forever(self) -> None:
        print("[AI] Engine started. Press Ctrl+C to stop.")

        while True:
            try:
                self.run_once()
            except KeyboardInterrupt:
                print("\n[AI] Engine stopped by user.")
                break
            except Exception as exc:
                print(f"[AI] Runtime error: {exc}")
                try:
                    self.client.write_system_log("error", str(exc))
                except Exception:
                    pass

            time.sleep(self.poll_interval)


if __name__ == "__main__":
    engine = SmartEnergyAIEngine()

    run_once = os.getenv("AI_RUN_ONCE", "false").lower() in ("1", "true", "yes")

    if run_once:
        print("[AI] Running once for scheduled cloud job...")
        engine.run_once()
        print("[AI] One-time run complete.")
    else:
        engine.run_forever()
