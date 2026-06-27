import time
from typing import Any, Dict, List

from anomaly_detector import safe_float, mean


def _valid_power_values(history: List[Dict[str, Any]]) -> List[float]:
    values = []

    for row in history:
        power = safe_float(row.get("power_w"))

        if power >= 0:
            values.append(power)

    return values


def _valid_energy_values(history: List[Dict[str, Any]]) -> List[float]:
    values = []

    for row in history:
        energy = safe_float(row.get("energy_kwh"))

        if energy >= 0:
            values.append(energy)

    return values


def estimate_usage_from_power(history: List[Dict[str, Any]]) -> Dict[str, float]:
    powers = _valid_power_values(history)

    if not powers:
        return {
            "average_power_w": 0.0,
            "peak_power_w": 0.0,
            "forecast_daily_kwh": 0.0,
            "forecast_weekly_kwh": 0.0,
            "forecast_monthly_kwh": 0.0,
            "forecast_yearly_kwh": 0.0,
        }

    avg_power = mean(powers)
    peak_power = max(powers)

    daily_kwh = avg_power * 24.0 / 1000.0
    weekly_kwh = daily_kwh * 7.0
    monthly_kwh = daily_kwh * 30.0
    yearly_kwh = daily_kwh * 365.0

    return {
        "average_power_w": round(avg_power, 2),
        "peak_power_w": round(peak_power, 2),
        "forecast_daily_kwh": round(daily_kwh, 4),
        "forecast_weekly_kwh": round(weekly_kwh, 4),
        "forecast_monthly_kwh": round(monthly_kwh, 4),
        "forecast_yearly_kwh": round(yearly_kwh, 4),
    }


def estimate_remaining_units(
    history: List[Dict[str, Any]],
    settings: Dict[str, Any],
    live_snapshot: Dict[str, Any] | None = None,
) -> Dict[str, float]:
    """
    Professional prepaid-energy calculation.

    Source of truth for current meter energy:
      1. live_snapshot["energy_kwh"] from /live/{deviceId}
      2. fallback to last history energy if live is unavailable

    Correct method:
      used_since_topup = current_meter_energy - prepaid_start_energy
      remaining = prepaid_units - used_since_topup

    prepaid_start_energy_kwh must be captured when the user enters new units.
    """
    prepaid_units = safe_float(
        settings.get("prepaid_units_kwh"),
        safe_float(settings.get("prepaid_units"), 0.0),
    )

    live_snapshot = live_snapshot or {}

    live_energy = safe_float(live_snapshot.get("energy_kwh"), -1.0)

    if live_energy >= 0:
        latest_energy = live_energy
    else:
        energies = _valid_energy_values(history)
        latest_energy = energies[-1] if energies else 0.0

    prepaid_start_energy = safe_float(
        settings.get("prepaid_start_energy_kwh"),
        latest_energy,
    )

    used_since_topup = latest_energy - prepaid_start_energy

    if used_since_topup < 0:
        used_since_topup = 0.0

    remaining = max(prepaid_units - used_since_topup, 0.0) if prepaid_units > 0 else 0.0

    usage = estimate_usage_from_power(history)
    daily_forecast = usage["forecast_daily_kwh"]

    if daily_forecast > 0 and remaining > 0:
        days_remaining = remaining / daily_forecast
    else:
        days_remaining = 0.0

    return {
        "prepaid_units_kwh": round(prepaid_units, 4),
        "prepaid_start_energy_kwh": round(prepaid_start_energy, 4),
        "latest_meter_energy_kwh": round(latest_energy, 4),
        "used_since_topup_kwh": round(used_since_topup, 4),
        "remaining_prepaid_units_kwh": round(remaining, 4),
        "estimated_days_remaining": round(days_remaining, 2),
    }

def build_recommendation(
    risk_level: str,
    anomaly_result: Dict[str, Any],
    usage_forecast: Dict[str, float],
    remaining_units: Dict[str, float],
) -> str:
    primary = anomaly_result.get("primary_event", {})
    event_type = primary.get("type", "normal")

    if risk_level == "high":
        return primary.get(
            "message",
            "High electrical risk detected. Inspect the load and supply condition immediately.",
        )

    if event_type == "poor_power_factor":
        return "Power factor is low. Check inductive loads such as motors, fans, pumps, or adapters."

    if event_type == "power_anomaly":
        return "Power usage is unusual compared with learned history. Check if a new load was connected."

    if event_type == "voltage_anomaly":
        return "Voltage behavior is unusual compared with normal history. Monitor supply stability."

    if event_type == "sudden_power_jump":
        return "Sudden load jump detected. Confirm whether a high-power appliance was switched on."

    if remaining_units.get("estimated_days_remaining", 0) > 0 and remaining_units["estimated_days_remaining"] < 3:
        return "Prepaid energy balance may run out soon based on current consumption pattern."

    if usage_forecast.get("forecast_daily_kwh", 0) > 10:
        return "Daily energy forecast is high. Consider reducing heavy loads during peak usage."

    return "Energy behavior is within expected range. Continue monitoring."


def build_prediction(
    history: List[Dict[str, Any]],
    settings: Dict[str, Any],
    anomaly_result: Dict[str, Any],
) -> Dict[str, Any]:
    usage_forecast = estimate_usage_from_power(history)
    live_snapshot = anomaly_result.get("live_snapshot", {})
    remaining_units = estimate_remaining_units(history, settings, live_snapshot)

    risk_level = anomaly_result.get("risk_level", "low")
    recommendation = build_recommendation(
        risk_level,
        anomaly_result,
        usage_forecast,
        remaining_units,
    )

    return {
        "risk_level": risk_level,
        "anomaly_score": anomaly_result.get("anomaly_score", 0.0),
        "primary_event": anomaly_result.get("primary_event", {}),
        "events": anomaly_result.get("events", []),
        "recommendation": recommendation,

        "average_power_w": usage_forecast["average_power_w"],
        "peak_power_w": usage_forecast["peak_power_w"],
        "forecast_daily_kwh": usage_forecast["forecast_daily_kwh"],
        "forecast_weekly_kwh": usage_forecast["forecast_weekly_kwh"],
        "forecast_monthly_kwh": usage_forecast["forecast_monthly_kwh"],
        "forecast_yearly_kwh": usage_forecast["forecast_yearly_kwh"],

        "prepaid_units_kwh": remaining_units["prepaid_units_kwh"],
        "latest_meter_energy_kwh": remaining_units["latest_meter_energy_kwh"],
        "remaining_prepaid_units_kwh": remaining_units["remaining_prepaid_units_kwh"],
        "estimated_days_remaining": remaining_units["estimated_days_remaining"],

        "baseline": anomaly_result.get("baseline", {}),
        "live_snapshot": anomaly_result.get("live_snapshot", {}),
        "updated_at": int(time.time()),
        "source": "ai-engine",
    }
