Firmware provisioning and local build notes
========================================

Quick steps to build the canonical firmware locally and provide the
non-committed config used at build time.

1. Create a local firmware config file (DO NOT commit):

   mkdir -p firmware
   cp firmware/config.h firmware/config.h.local
   # Edit firmware/config.h.local and set WIFI_SSID, WIFI_PASSWORD,
   # FB_API_KEY, and either FB_ROOT_CA_PEM or FB_FINGERPRINT.

2. For local compile checks (example):

   mkdir -p build_temp_sketch/SmartEnergySketch/firmware
   cp firmware/config.h build_temp_sketch/SmartEnergySketch/firmware/config.h
   arduino-cli compile --fqbn esp32:esp32:esp32 build_temp_sketch/SmartEnergySketch

3. Notes on TLS pinning

- Prefer setting `FB_ROOT_CA_PEM` (CA certificate PEM) for robust validation.
- If you only have a fingerprint, be aware some ESP32 core versions may
  not support the fingerprint setter API; in that case the code will
  warn and fall back to insecure TLS — update the board/core or provide
  the CA PEM for production.

4. Token exchange / provisioning

- Set `TOKEN_EXCHANGE_URL` and `DEVICE_PROVISION_KEY` in your local
  `firmware/config.h` during device provisioning. The device will
  request a short-lived token and prefer that over legacy secrets.

5. Flashing and runtime tests

- After compiling, flash to an ESP32 and verify serial logs for:
  - WiFi connection
  - TLS validation messages (FB_ROOT_CA_PEM vs fingerprint vs insecure)
  - Token exchange attempts and Firebase auth flows

6. Security reminder

- Never commit a real `firmware/config.h` with secrets to the repo.
- Keep `DEVICE_PROVISION_KEY` and any service account credentials
  in a secure secret store.
