#include "alarm_manager.h"

#include "pins.h"

static unsigned long lastBlinkTime = 0;
static unsigned long lastBuzzerToggleTime = 0;
static unsigned long lastWarningChirpTime = 0;

static bool blinkState = false;
static bool buzzerState = false;

static void writeBuzzer(bool on) {
  digitalWrite(BUZZER_PIN, on ? HIGH : LOW);
  buzzerState = on;
}

static void setLeds(bool green, bool yellow, bool red) {
  digitalWrite(LED_GREEN_PIN, green ? HIGH : LOW);
  digitalWrite(LED_YELLOW_PIN, yellow ? HIGH : LOW);
  digitalWrite(LED_RED_PIN, red ? HIGH : LOW);
}

void initAlarmManager() {
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  setLeds(false, false, false);
  writeBuzzer(false);
}

void showBootLedPattern() {
  setLeds(true, false, false);
  delay(120);

  setLeds(false, true, false);
  delay(120);

  setLeds(false, false, true);
  delay(120);

  setLeds(false, false, false);
  writeBuzzer(false);
}

void showWifiConnectingState() {
  unsigned long now = millis();

  if (now - lastBlinkTime >= 500) {
    lastBlinkTime = now;
    blinkState = !blinkState;
    setLeds(false, blinkState, false);
  }

  writeBuzzer(false);
}

void showNormalState() {
  setLeds(true, false, false);
  writeBuzzer(false);
}

void showWarningState() {
  setLeds(false, true, false);

  unsigned long now = millis();

  /*
    Warning mode:
    - Yellow LED stays ON.
    - Buzzer gives a short chirp every 10 seconds.
    - This avoids continuous noise for non-critical warnings like poor PF.
  */
  if (now - lastWarningChirpTime >= 10000) {
    lastWarningChirpTime = now;

    writeBuzzer(true);
    delay(80);
    writeBuzzer(false);
  }
}

void showCriticalState() {
  setLeds(false, false, true);

  unsigned long now = millis();

  /*
    Critical mode:
    - Red LED ON.
    - Buzzer toggles every 300 ms.
  */
  if (now - lastBuzzerToggleTime >= 300) {
    lastBuzzerToggleTime = now;
    writeBuzzer(!buzzerState);
  }
}

void showSensorErrorState() {
  unsigned long now = millis();

  /*
    Sensor error mode:
    - Red LED blinks.
    - Buzzer pulses slowly.
  */
  if (now - lastBlinkTime >= 600) {
    lastBlinkTime = now;
    blinkState = !blinkState;

    setLeds(false, false, blinkState);
    writeBuzzer(blinkState);
  }
}

void updateAlarmManager(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected
) {
  if (!reading.valid || status.status == "sensor_error") {
    showSensorErrorState();
    return;
  }

  if (!wifiConnected) {
    showWifiConnectingState();
    return;
  }

  if (status.status == "critical") {
    showCriticalState();
    return;
  }

  if (status.status == "warning") {
    showWarningState();
    return;
  }

  showNormalState();
}
