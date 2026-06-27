#ifndef SMART_ENERGY_ANALYZER_H
#define SMART_ENERGY_ANALYZER_H

#include <Arduino.h>
#include "pzem_reader.h"

struct EnergyStatus {
  String status = "ok";
  String power_quality = "normal";
  String message = "Energy behavior is normal.";
};

EnergyStatus analyzeEnergyReading(const EnergyReading& reading);

#endif
