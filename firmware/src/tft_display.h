#ifndef SMART_ENERGY_TFT_DISPLAY_H
#define SMART_ENERGY_TFT_DISPLAY_H

#include <Arduino.h>
#include "pzem_reader.h"
#include "energy_analyzer.h"
#include "firebase_client.h"

void initTftDisplay();
void showBootScreen();

void updateTftAiPrediction(const AiPrediction& prediction);

void updateTftSummaries(
  const ConsumptionSummary& daily,
  const ConsumptionSummary& weekly,
  const ConsumptionSummary& monthly,
  const ConsumptionSummary& yearly
);

void showEnergyScreen(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected,
  const String& ipAddress
);

#endif
