#ifndef SMART_ENERGY_ALARM_MANAGER_H
#define SMART_ENERGY_ALARM_MANAGER_H

#include <Arduino.h>
#include "pzem_reader.h"
#include "energy_analyzer.h"

void initAlarmManager();

void showBootLedPattern();
void showWifiConnectingState();
void showNormalState();
void showWarningState();
void showCriticalState();
void showSensorErrorState();

void updateAlarmManager(
  const EnergyReading& reading,
  const EnergyStatus& status,
  bool wifiConnected
);

#endif
