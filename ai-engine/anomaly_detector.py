import math
import time
from typing import Any, Dict, List


DEFAULT_THRESHOLDS = {
    "voltage_min_safe": 180.0,
    "voltage_max_safe": 250.0,
    "current_max_safe": 10.0,
    "power_max_safe": 2200.0,
    "power_factor_min_safe": 0.75,
    "poor_pf_min_power_w": 100.0,
    "anomaly_threshold": 2.5,
}


def safe_float(value: Any, default: float = 0.0) -> float:
    try:
        if value is None:
            return default
        value = float(value)
        if math.isnan(value) or math.isinf(value):
            return default
        return value
    except Exception:
        return default


def mean(values: List[float]) -> float:
    if not values:
        return 0.0
    return sum(values) / len(values)


def stddev(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0

    avg = mean(values)
    variance = sum((value - avg) ** 2 for value in values) / (len(values) - 1)
    return math.sqrt(variance)


def build_baseline(history: List[Dict[str, Any]]) -> Dict[str, Any]:
    voltage = [safe_float(row.get("voltage_v")) for row in history if safe_float(row.get("voltage_v")) > 0]
    current = [safe_float(row.get("current_a")) for row in history if safe_float(row.get("current_a")) >= 0]
    power = [safe_float(row.get("power_w")) for row in history if safe_float(row.get("power_w")) >= 0]
    pf = [safe_float(row.get("power_factor")) for row in history if safe_float(row.get("power_factor")) >= 0]

    return {
        "sample_count": len(history),
        "voltage": {
            "mean": mean(voltage),
            "std": stddev(voltage),
            "min": min(voltage) if voltage else 0.0,
            "max": max(voltage) if voltage else 0.0,
        },
        "current": {
            "mean": mean(current),
            "std": stddev(current),
            "min": min(current) if current else 0.0,
            "max": max(current) if current else 0.0,
        },
        "power": {
            "mean": mean(power),
            "std": stddev(power),
            "min": min(power) if power else 0.0,
            "max": max(power) if power else 0.0,
        },
        "power_factor": {
            "mean": mean(pf),
            "std": stddev(pf),
            "min": min(pf) if pf else 0.0,
            "max": max(pf) if pf else 0.0,
        },
    }


def z_score(value: float, avg: float, sd: float) -> float:
    if sd <= 0.0001:
        return 0.0
    return abs(value - avg) / sd


def detect_flatline(history: List[Dict[str, Any]], field: str, tolerance: float, min_count: int = 12) -> bool:
    if len(history) < min_count:
        return False

    recent = history[-min_count:]
    values = [safe_float(row.get(field)) for row in recent]
    return max(values) - min(values) <= tolerance


def detect_sudden_jump(history: List[Dict[str, Any]], field: str, percent_limit: float = 60.0) -> bool:
    if len(history) < 4:
        return False

    previous = safe_float(history[-2].get(field))
    latest = safe_float(history[-1].get(field))

    if previous <= 0:
        return False

    change_percent = abs(latest - previous) / previous * 100.0
    return change_percent >= percent_limit


def analyze_reading(
    live: Dict[str, Any],
    history: List[Dict[str, Any]],
    settings: Dict[str, Any],
) -> Dict[str, Any]:
    thresholds = dict(DEFAULT_THRESHOLDS)
    thresholds.update({key: safe_float(value, thresholds.get(key, 0.0)) for key, value in settings.items()})

    voltage = safe_float(live.get("voltage_v"))
    current = safe_float(live.get("current_a"))
    power = safe_float(live.get("power_w"))
    pf = safe_float(live.get("power_factor"))
    frequency = safe_float(live.get("frequency_hz"))
    energy = safe_float(live.get("energy_kwh"))

    baseline = build_baseline(history)

    events = []
    risk_score = 0.0

    if voltage <= 0 or live.get("sensor_status") == "reading_error":
        events.append(("critical", "sensor_error", "Energy sensor reading is invalid."))
        risk_score += 1.0

    if voltage and voltage < thresholds["voltage_min_safe"]:
        events.append(("critical", "undervoltage", "Voltage is below safe operating limit."))
        risk_score += 0.9

    if voltage > thresholds["voltage_max_safe"]:
        events.append(("critical", "overvoltage", "Voltage is above safe operating limit."))
        risk_score += 0.9

    if current > thresholds["current_max_safe"]:
        events.append(("critical", "overcurrent", "Current is above configured safe limit."))
        risk_score += 0.9

    if power > thresholds["power_max_safe"]:
        events.append(("critical", "overload", "Power consumption is above configured safe load."))
        risk_score += 0.9

    if power >= thresholds["poor_pf_min_power_w"] and pf > 0 and pf < thresholds["power_factor_min_safe"]:
        events.append(("warning", "poor_power_factor", "Power factor is poor under meaningful load."))
        risk_score += 0.35

    voltage_z = z_score(voltage, baseline["voltage"]["mean"], baseline["voltage"]["std"])
    power_z = z_score(power, baseline["power"]["mean"], baseline["power"]["std"])
    current_z = z_score(current, baseline["current"]["mean"], baseline["current"]["std"])

    learned_threshold = thresholds["anomaly_threshold"]

    if baseline["sample_count"] >= 30 and voltage_z >= learned_threshold:
        events.append(("warning", "voltage_anomaly", "Voltage is unusual compared with learned history."))
        risk_score += min(voltage_z / 10.0, 0.5)

    if baseline["sample_count"] >= 30 and power_z >= learned_threshold:
        events.append(("warning", "power_anomaly", "Power usage is unusual compared with learned history."))
        risk_score += min(power_z / 10.0, 0.5)

    if baseline["sample_count"] >= 30 and current_z >= learned_threshold:
        events.append(("warning", "current_anomaly", "Current draw is unusual compared with learned history."))
        risk_score += min(current_z / 10.0, 0.5)

    if detect_flatline(history, "voltage_v", tolerance=0.05):
        events.append(("warning", "voltage_flatline", "Voltage reading has not changed for a long period."))
        risk_score += 0.25

    if detect_sudden_jump(history, "power_w", percent_limit=70.0):
        events.append(("warning", "sudden_power_jump", "Power changed suddenly compared with previous reading."))
        risk_score += 0.35

    risk_score = min(risk_score, 1.0)

    if risk_score >= 0.75:
        risk_level = "high"
    elif risk_score >= 0.35:
        risk_level = "medium"
    else:
        risk_level = "low"

    if not events:
        recommendation = "Energy behavior is within expected range."
        primary_event = {
            "level": "info",
            "type": "normal",
            "message": "No anomaly detected.",
        }
    else:
        primary = sorted(events, key=lambda item: 0 if item[0] == "critical" else 1)[0]
        primary_event = {
            "level": primary[0],
            "type": primary[1],
            "message": primary[2],
        }
        recommendation = primary[2]

    return {
        "risk_level": risk_level,
        "anomaly_score": round(risk_score, 3),
        "primary_event": primary_event,
        "events": [
            {"level": level, "type": event_type, "message": message}
            for level, event_type, message in events
        ],
        "baseline": baseline,
        "live_snapshot": {
            "voltage_v": voltage,
            "current_a": current,
            "power_w": power,
            "energy_kwh": energy,
            "frequency_hz": frequency,
            "power_factor": pf,
        },
        "recommendation": recommendation,
        "updated_at": int(time.time()),
    }
