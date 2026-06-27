#ifndef SMART_ENERGY_PZEM_READER_H
#define SMART_ENERGY_PZEM_READER_H

#include <Arduino.h>

struct EnergyReading {
  float voltage_v;
  float current_a;
  float power_w;
  float energy_kwh;
  float frequency_hz;
  float power_factor;
  bool valid;
  String sensor_status;
};

void initPzemReader();
EnergyReading readEnergyData();

#endif
