#include <Arduino.h>
#include <math.h>
#include <PZEM004Tv30.h>

#include "pzem_reader.h"
#include "pins.h"

static HardwareSerial pzemSerial(2);
static PZEM004Tv30 pzem(pzemSerial, PZEM_RX_PIN, PZEM_TX_PIN);

static bool isValidReading(float value) {
  return !isnan(value) && !isinf(value);
}

void initPzemReader() {
  pzemSerial.begin(9600, SERIAL_8N1, PZEM_RX_PIN, PZEM_TX_PIN);
  delay(300);
}

EnergyReading readEnergyData() {
  EnergyReading reading;

  reading.voltage_v = pzem.voltage();
  reading.current_a = pzem.current();
  reading.power_w = pzem.power();
  reading.energy_kwh = pzem.energy();
  reading.frequency_hz = pzem.frequency();
  reading.power_factor = pzem.pf();

  bool voltageOk = isValidReading(reading.voltage_v);
  bool currentOk = isValidReading(reading.current_a);
  bool powerOk = isValidReading(reading.power_w);
  bool energyOk = isValidReading(reading.energy_kwh);
  bool frequencyOk = isValidReading(reading.frequency_hz);
  bool pfOk = isValidReading(reading.power_factor);

  reading.valid = voltageOk && currentOk && powerOk && energyOk && frequencyOk && pfOk;

  if (!reading.valid) {
    reading.voltage_v = 0.0;
    reading.current_a = 0.0;
    reading.power_w = 0.0;
    reading.energy_kwh = 0.0;
    reading.frequency_hz = 0.0;
    reading.power_factor = 0.0;
    reading.sensor_status = "reading_error";
    return reading;
  }

  reading.sensor_status = "connected";
  return reading;
}
