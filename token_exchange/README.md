# Token Exchange Server

Simple token exchange service to issue short-lived JWTs for devices. Intended to run on a secure backend (CI, admin server, or cloud function). Devices should obtain tokens via a secure provisioning workflow.

Environment variables:

- `TOKEN_EXCHANGE_SECRET` — HMAC secret used to sign JWTs (keep secret).
- `PROVISION_API_KEY` — long-lived provision key used by admin/CI to request device tokens.

Run locally (recommended inside a virtualenv):

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
export TOKEN_EXCHANGE_SECRET="supersecret"
export PROVISION_API_KEY="provision-key"
python app.py
```

Issue a token (example):

```bash
curl -s -X POST http://localhost:5000/issue-token \
  -H "Authorization: Bearer provision-key" \
  -H "Content-Type: application/json" \
  -d '{"device_id":"device-001","ttl":3600}'
```
