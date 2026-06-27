#ifndef SMART_ENERGY_FIREBASE_CLIENT_H
#define SMART_ENERGY_FIREBASE_CLIENT_H

#include <Arduino.h>
#include "pzem_reader.h"
#include "energy_analyzer.h"

struct AiPrediction {
  bool valid = false;

  String risk_level = "unknown";
  float anomaly_score = 0.0;

  String primary_level = "info";
  String primary_type = "normal";
  String primary_message = "No AI event yet.";

  String recommendation = "Waiting for AI engine...";

  float average_power_w = 0.0;
  float peak_power_w = 0.0;

  float forecast_daily_kwh = 0.0;
  float forecast_weekly_kwh = 0.0;
  float forecast_monthly_kwh = 0.0;
  float forecast_yearly_kwh = 0.0;

  float prepaid_units_kwh = 0.0;
  float remaining_prepaid_units_kwh = 0.0;
  float estimated_days_remaining = 0.0;

  unsigned long updated_at = 0;
};

struct ConsumptionSummary {
  bool valid = false;

  String period = "unknown";

  float kwh_used = 0.0;
  float estimated_cost = 0.0;
  float tariff_per_kwh = 0.0;

  float average_power_w = 0.0;
  float peak_power_w = 0.0;
  float average_voltage_v = 0.0;

  float prepaid_units_kwh = 0.0;
  float remaining_prepaid_units_kwh = 0.0;

  int sample_count = 0;
  unsigned long updated_at = 0;
};

void initFirebaseClient();

bool publishLiveReading(
  const EnergyReading& reading,
  const EnergyStatus& status,
  int wifiRssi
);

bool publishDeviceStatus(
  bool online,
  const String& ipAddress,
  int wifiRssi,
  const String& sensorStatus
);

bool publishHistoryReading(const EnergyReading& reading);

bool publishAlert(
  const String& level,
  const String& type,
  const String& source,
  const String& message,
  float value,
  float threshold
);

bool fetchAiPrediction(AiPrediction& prediction);

bool fetchConsumptionSummary(
  const String& period,
  ConsumptionSummary& summary
);

#endif
