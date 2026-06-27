#include "energy_analyzer.h"

#include "config.h"

EnergyStatus analyzeEnergyReading(const EnergyReading& reading) {
  EnergyStatus status;

  status.status = "ok";
  status.power_quality = "normal";
  status.message = "Energy behavior is normal.";

  if (!reading.valid || reading.sensor_status == "reading_error") {
    status.status = "sensor_error";
    status.power_quality = "sensor_error";
    status.message = "PZEM sensor reading failed.";
    return status;
  }

  if (reading.voltage_v <= 0) {
    status.status = "sensor_error";
    status.power_quality = "sensor_error";
    status.message = "Invalid voltage reading.";
    return status;
  }

  if (reading.voltage_v < VOLTAGE_MIN_SAFE) {
    status.status = "critical";
    status.power_quality = "undervoltage";
    status.message = "Voltage is below safe limit.";
    return status;
  }

  if (reading.voltage_v > VOLTAGE_MAX_SAFE) {
    status.status = "critical";
    status.power_quality = "overvoltage";
    status.message = "Voltage is above safe limit.";
    return status;
  }

  if (reading.current_a > CURRENT_MAX_SAFE) {
    status.status = "critical";
    status.power_quality = "overcurrent";
    status.message = "Current is above safe limit.";
    return status;
  }

  if (reading.power_w > POWER_MAX_SAFE) {
    status.status = "critical";
    status.power_quality = "overload";
    status.message = "Load power is above safe limit.";
    return status;
  }

  /*
    Poor power factor should only warn when the load is meaningful.

    At very low load, many meters and small appliances report unstable or low PF.
    Warning at 20 W to 40 W creates false alarms.
  */
  if (
    reading.power_w >= POOR_POWER_FACTOR_MIN_POWER_W &&
    reading.power_factor > 0 &&
    reading.power_factor < POWER_FACTOR_MIN_SAFE
  ) {
    status.status = "warning";
    status.power_quality = "poor_power_factor";
    status.message = "Poor power factor detected under meaningful load.";
    return status;
  }

  status.status = "ok";
  status.power_quality = "normal";
  status.message = "Energy behavior is within expected range.";

  return status;
}
