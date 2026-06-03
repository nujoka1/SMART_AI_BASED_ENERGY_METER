import os
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, abort
import jwt

SECRET = os.getenv("TOKEN_EXCHANGE_SECRET", "change-me-secret")
PROVISION_KEY = os.getenv("PROVISION_API_KEY", "change-me-provision")

app = Flask(__name__)


@app.route("/issue-token", methods=["POST"])
def issue_token():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return jsonify({"error": "missing Authorization Bearer token"}), 401
    provision = auth.split(" ", 1)[1]
    if provision != PROVISION_KEY:
        return jsonify({"error": "invalid provision key"}), 403

    data = request.get_json() or {}
    device_id = data.get("device_id")
    if not device_id:
        return jsonify({"error": "device_id required"}), 400

    try:
        ttl = int(data.get("ttl", 3600))
    except Exception:
        ttl = 3600

    exp = datetime.utcnow() + timedelta(seconds=ttl)
    payload = {"device_id": device_id, "exp": exp}
    token = jwt.encode(payload, SECRET, algorithm="HS256")
    return jsonify({"token": token, "ttl": ttl})


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    host = os.getenv("HOST", "0.0.0.0")
    print("Starting token exchange server on %s:%s" % (host, port))
    app.run(host=host, port=port)
