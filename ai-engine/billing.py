import time
from datetime import datetime, timezone
from typing import Any, Dict, List

from anomaly_detector import safe_float


def parse_ts(row: Dict[str, Any]) -> datetime:
    raw = row.get("ts") or row.get("timestamp") or row.get("created_at") or row.get("updated_at")

    if isinstance(raw, str):
        try:
            return datetime.fromisoformat(raw.replace("Z", "+00:00"))
        except Exception:
            return datetime.now(timezone.utc)

    value = safe_float(raw)

    if value <= 0:
        return datetime.now(timezone.utc)

    if value > 1_000_000_000_000:
        value = value / 1000.0

    if value < 1_000_000_000:
        return datetime.now(timezone.utc)

    return datetime.fromtimestamp(value, tz=timezone.utc)


def energy_delta_kwh(rows: List[Dict[str, Any]]) -> float:
    values = [safe_float(row.get("energy_kwh")) for row in rows if safe_float(row.get("energy_kwh")) >= 0]

    if len(values) < 2:
        return 0.0

    delta = values[-1] - values[0]

    if delta < 0:
        return 0.0

    return round(delta, 4)


def filter_period(history: List[Dict[str, Any]], period: str) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)

    filtered = []

    for row in history:
        ts = parse_ts(row)

        keep = False

        if period == "daily":
            keep = ts.date() == now.date()
        elif period == "weekly":
            keep = ts.isocalendar().year == now.isocalendar().year and ts.isocalendar().week == now.isocalendar().week
        elif period == "monthly":
            keep = ts.year == now.year and ts.month == now.month
        elif period == "yearly":
            keep = ts.year == now.year

        if keep:
            filtered.append(row)

    if not filtered and history:
        if period == "daily":
            filtered = history[-120:]
        elif period == "weekly":
            filtered = history[-300:]
        elif period == "monthly":
            filtered = history
        elif period == "yearly":
            filtered = history

    return filtered


def build_consumption_summary(
    history: List[Dict[str, Any]],
    settings: Dict[str, Any],
    period: str,
) -> Dict[str, Any]:
    tariff = safe_float(settings.get("tariff_per_kwh"), 0.0)
    prepaid_units = safe_float(settings.get("prepaid_units_kwh"), safe_float(settings.get("prepaid_units"), 0.0))

    rows = filter_period(history, period)

    kwh_used = energy_delta_kwh(rows)
    estimated_cost = round(kwh_used * tariff, 2)

    latest_energy = safe_float(history[-1].get("energy_kwh")) if history else 0.0
    remaining_units = max(prepaid_units - latest_energy, 0.0) if prepaid_units > 0 else 0.0

    powers = [safe_float(row.get("power_w")) for row in rows if safe_float(row.get("power_w")) >= 0]
    voltages = [safe_float(row.get("voltage_v")) for row in rows if safe_float(row.get("voltage_v")) > 0]

    average_power = round(sum(powers) / len(powers), 2) if powers else 0.0
    peak_power = round(max(powers), 2) if powers else 0.0
    average_voltage = round(sum(voltages) / len(voltages), 2) if voltages else 0.0

    return {
        "period": period,
        "sample_count": len(rows),
        "kwh_used": kwh_used,
        "estimated_cost": estimated_cost,
        "tariff_per_kwh": tariff,
        "prepaid_units_kwh": prepaid_units,
        "remaining_prepaid_units_kwh": round(remaining_units, 4),
        "average_power_w": average_power,
        "peak_power_w": peak_power,
        "average_voltage_v": average_voltage,
        "updated_at": int(time.time()),
    }
