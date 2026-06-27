import os
import time
import requests
from dotenv import load_dotenv

load_dotenv()


class FirebaseClient:
    def __init__(self):
        self.device_id = os.getenv("DEVICE_ID", "esp32_energy_meter_01")

        self.database_url = (
            os.getenv("FIREBASE_DATABASE_URL")
            or os.getenv("AI_FIREBASE_URL")
            or ""
        ).rstrip("/")

        self.firebase_url = self.database_url
        self.base_url = self.database_url

        self.api_key = os.getenv("FIREBASE_API_KEY", "")
        self.email = os.getenv("FIREBASE_AUTH_EMAIL", "")
        self.password = os.getenv("FIREBASE_AUTH_PASSWORD", "")

        self.id_token = None
        self.refresh_token = None
        self.token_expires_at = 0

        if not self.database_url:
            raise RuntimeError("FIREBASE_DATABASE_URL or AI_FIREBASE_URL is missing in .env")

        if not self.api_key or self.api_key == "YOUR_FIREBASE_WEB_API_KEY":
            raise RuntimeError("FIREBASE_API_KEY is missing or still a placeholder in .env")

        if not self.email or not self.password:
            raise RuntimeError("FIREBASE_AUTH_EMAIL or FIREBASE_AUTH_PASSWORD is missing in .env")

    # ------------------------------------------------------------
    # Firebase Auth
    # ------------------------------------------------------------
    def login(self):
        url = (
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword"
            f"?key={self.api_key}"
        )

        payload = {
            "email": self.email,
            "password": self.password,
            "returnSecureToken": True,
        }

        response = requests.post(url, json=payload, timeout=20)
        response.raise_for_status()

        data = response.json()

        self.id_token = data["idToken"]
        self.refresh_token = data.get("refreshToken")
        expires_in = int(data.get("expiresIn", "3600"))

        self.token_expires_at = time.time() + expires_in - 120

        print(f"[Firebase] Authenticated AI engine as {self.email}")

    def ensure_token(self):
        if not self.id_token or time.time() >= self.token_expires_at:
            self.login()

    def make_url(self, path):
        self.ensure_token()
        clean_path = str(path).strip("/")
        return f"{self.database_url}/{clean_path}.json?auth={self.id_token}"

    # ------------------------------------------------------------
    # Generic RTDB helpers
    # ------------------------------------------------------------
    def get(self, path, default=None):
        try:
            response = requests.get(self.make_url(path), timeout=20)
            response.raise_for_status()
            value = response.json()
            return default if value is None else value
        except Exception as error:
            print(f"[Firebase] GET failed for /{str(path).strip('/')}: {error}")
            return default

    def put(self, path, data):
        try:
            response = requests.put(self.make_url(path), json=data, timeout=20)
            response.raise_for_status()
            print(f"[Firebase] PUT /{str(path).strip('/')} response: {response.status_code}")
            return True
        except Exception as error:
            print(f"[Firebase] PUT /{str(path).strip('/')} failed: {error}")
            return False

    def patch(self, path, data):
        try:
            response = requests.patch(self.make_url(path), json=data, timeout=20)
            response.raise_for_status()
            print(f"[Firebase] PATCH /{str(path).strip('/')} response: {response.status_code}")
            return True
        except Exception as error:
            print(f"[Firebase] PATCH /{str(path).strip('/')} failed: {error}")
            return False

    def post(self, path, data):
        try:
            response = requests.post(self.make_url(path), json=data, timeout=20)
            response.raise_for_status()
            print(f"[Firebase] POST /{str(path).strip('/')} response: {response.status_code}")
            return response.json()
        except Exception as error:
            print(f"[Firebase] POST /{str(path).strip('/')} failed: {error}")
            return None

    # ------------------------------------------------------------
    # Compatibility methods expected by ai_engine.py
    # ------------------------------------------------------------
    def get_live(self):
        return self.get(f"live/{self.device_id}", default=None)

    def get_settings(self):
        return self.get(f"settings/{self.device_id}", default=None)

    def write_settings(self, data):
        return self.put(f"settings/{self.device_id}", data)

    def put_settings(self, data):
        return self.write_settings(data)

    def update_settings(self, data):
        return self.patch(f"settings/{self.device_id}", data)

    def get_history(self, limit=500, max_records=None):
        if max_records is not None:
            limit = max_records

        data = self.get(f"history/{self.device_id}", default={})

        if not data:
            return []

        if isinstance(data, list):
            return data[-limit:]

        if isinstance(data, dict):
            rows = []
            for key, value in data.items():
                if isinstance(value, dict):
                    row = dict(value)
                    row["_key"] = key
                    rows.append(row)

            def sort_key(row):
                return (
                    row.get("updated_at_ms")
                    or row.get("timestamp_ms")
                    or row.get("timestamp")
                    or row.get("updated_at")
                    or row.get("created_at")
                    or 0
                )

            rows.sort(key=sort_key)
            return rows[-limit:]

        return []

    def write_prediction(self, data):
        return self.put(f"ai_predictions/{self.device_id}", data)

    def put_prediction(self, data):
        return self.write_prediction(data)

    def write_ai_prediction(self, data):
        return self.write_prediction(data)

    def write_summary(self, period, data):
        period = str(period).lower().strip()
        return self.put(f"{period}_summary/{self.device_id}", data)

    def write_daily_summary(self, data):
        return self.write_summary("daily", data)

    def write_weekly_summary(self, data):
        return self.write_summary("weekly", data)

    def write_monthly_summary(self, data):
        return self.write_summary("monthly", data)

    def write_yearly_summary(self, data):
        return self.write_summary("yearly", data)

    def write_alert(self, data):
        return self.post(f"alerts/{self.device_id}", data)

    def post_alert(self, data):
        return self.write_alert(data)
