#ifndef FIRMWARE_CONFIG_H
#define FIRMWARE_CONFIG_H

// Firmware build-time configuration.
// IMPORTANT: Copy this file to firmware/config.h (in your local build env),
// replace the placeholder values with real secrets, and DO NOT commit the
// real file into version control. This repository includes a template only.

// WiFi
#define WIFI_SSID     "REPLACE_WITH_SSID"
#define WIFI_PASSWORD "REPLACE_WITH_PASSWORD"

// Firebase Realtime Database
// Use your RTDB host (without https://) e.g. "your-project-default-rtdb.europe-west1.firebasedatabase.app"
#define FB_HOST       "smart-energy-monitor-5b72b-default-rtdb.europe-west1.firebasedatabase.app"
// API key (web) - optional for some REST flows
#define FB_API_KEY    "REPLACE_WITH_FIREBASE_API_KEY"
// Legacy database secret (not recommended). Use server tokens or OAuth where possible.
#define FB_SECRET     "REPLACE_WITH_FIREBASE_LEGACY_SECRET"

// Phone number for SMS alerts (E.164 format)
#define SIM_PHONE_NO  "+00000000000"

// TLS / Certificate pinning
// Provide either a SHA1 fingerprint for the server certificate (40 hex chars
// without colons) or provide the CA PEM as a quoted string. If both are set,
// the CA PEM will be preferred.
// Example fingerprint: "ABCD1234..."  (no spaces)
#define FB_FINGERPRINT ""

// If you want to embed the CA PEM, paste it as a single-line escaped string here.
// For example: "-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----\n"
#define FB_ROOT_CA_PEM ""

// Firebase Auth REST endpoint prefix for anonymous sign-in / token exchange
#define FB_AUTH_ENDPOINT "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key="

// Helper: configure a WiFiClientSecure instance using the provided pinning
// configuration. This function is intentionally simple; for large CA PEMs you
// may wish to store the PEM in PROGMEM and call setCACert_P.
static void configureSecureClient(WiFiClientSecure &client) {
	if (strlen(FB_ROOT_CA_PEM) > 4) {
		client.setCACert(FB_ROOT_CA_PEM);
		Serial.println("[TLS] Using FB_ROOT_CA_PEM for server validation");
	} else if (strlen(FB_FINGERPRINT) > 4) {
		// Older ESP32 cores supported setFingerprint(const char*). Newer
		// NetworkClientSecure APIs may not expose a setter. If a CA PEM is
		// not available but the user supplied a fingerprint, we warn and
		// fall back to insecure mode. For production, prefer FB_ROOT_CA_PEM
		// or update this code to use the platform-specific fingerprint API.
		Serial.println("[TLS] FB_FINGERPRINT provided but fingerprint API unavailable; falling back to insecure TLS");
		client.setInsecure();
	} else {
		client.setInsecure();
		Serial.println("[TLS] WARNING: No FB_FINGERPRINT or FB_ROOT_CA_PEM provided; using insecure TLS");
	}
}

// Token exchange / provisioning
// Devices can request a short-lived token from a trusted token exchange
// service. Provide the full URL to the token service and a device-specific
// provision key. The provision key is still sensitive — prefer storing it
// per-device during manufacturing or provisioning and keep it out of VCS.
#define TOKEN_EXCHANGE_URL ""
#define DEVICE_PROVISION_KEY ""

#endif // FIRMWARE_CONFIG_H
