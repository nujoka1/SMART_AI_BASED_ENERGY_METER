import React, { useEffect, useMemo, useState } from "react";
import { Activity, BrainCircuit, Clock, Lightbulb, ShieldAlert, Zap } from "lucide-react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { useDevice } from "../context/DeviceContext";

function numberValue(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatNumber(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "—";
  }
  return n.toFixed(digits);
}

function formatTime(timestamp) {
  const value = Number(timestamp);

  if (!Number.isFinite(value) || value <= 0) {
    return "Waiting for update";
  }

  const ms = value < 10000000000 ? value * 1000 : value;
  return new Date(ms).toLocaleString();
}

function getRiskClass(risk) {
  const r = String(risk || "").toLowerCase();

  if (r.includes("high") || r.includes("critical")) {
    return "danger";
  }

  if (r.includes("medium") || r.includes("warning")) {
    return "warning";
  }

  return "safe";
}

function buildAction(ai, live) {
  const risk = String(ai?.risk_level || "low").toLowerCase();
  const eventType = String(ai?.primary_event?.type || "").toLowerCase();
  const voltage = numberValue(live?.voltage_v);
  const power = numberValue(live?.power_w);
  const pf = numberValue(live?.power_factor);

  if (!ai) {
    return {
      reason: "The AI engine has not produced a fresh recommendation yet.",
      action: "Keep the meter powered and connected to WiFi while the AI engine studies the latest readings.",
      next: "The system will update this recommendation after the next AI cycle.",
    };
  }

  if (risk.includes("high") || risk.includes("critical")) {
    return {
      reason: ai?.primary_event?.message || "Abnormal energy behavior was detected from the recent readings.",
      action: "Reduce heavy loads, inspect connected appliances, and check for possible overload or abnormal supply condition.",
      next: "Monitor the next few readings. If the warning remains, disconnect non-essential appliances.",
    };
  }

  if (risk.includes("medium") || risk.includes("warning")) {
    return {
      reason: ai?.primary_event?.message || "The meter is observing a developing condition that may require attention.",
      action: "Continue monitoring and avoid adding heavy appliances until the reading returns to normal.",
      next: "Check the dashboard again after the next AI update.",
    };
  }

  if (eventType.includes("power_factor") || pf > 0 && pf < 0.75 && power > 100) {
    return {
      reason: "Power factor is lower than the recommended operating range.",
      action: "Avoid running many inductive loads together. Inspect motors, fans, or compressors if this continues.",
      next: "If low power factor continues, consider power-factor correction for larger installations.",
    };
  }

  if (voltage > 250) {
    return {
      reason: "Voltage is above the configured safe operating range.",
      action: "Avoid switching on sensitive appliances until the voltage stabilizes.",
      next: "If over-voltage persists, report the supply condition.",
    };
  }

  if (voltage > 0 && voltage < 180) {
    return {
      reason: "Voltage is below the configured safe operating range.",
      action: "Avoid heavy appliances because low voltage can stress motors and electronics.",
      next: "Wait for voltage recovery before increasing load.",
    };
  }

  return {
    reason: ai?.primary_event?.message || "Energy behavior is within the expected range.",
    action: ai?.recommendation || "Continue normal usage and monitor the prepaid balance.",
    next: "No urgent action is required. The system will keep learning from new readings.",
  };
}

export default function RealisticAiRecommendation() {
  const { deviceId } = useDevice();

  const [ai, setAi] = useState(null);
  const [live, setLive] = useState(null);

  useEffect(() => {
    const aiRef = ref(db, `ai_predictions/${deviceId}`);
    const liveRef = ref(db, `live/${deviceId}`);

    const unsubAi = onValue(aiRef, (snapshot) => {
      setAi(snapshot.val());
    });

    const unsubLive = onValue(liveRef, (snapshot) => {
      setLive(snapshot.val());
    });

    return () => {
      unsubAi();
      unsubLive();
    };
  }, [deviceId]);

  const advisory = useMemo(() => buildAction(ai, live), [ai, live]);

  const risk = ai?.risk_level || "waiting";
  const riskClass = getRiskClass(risk);
  const anomalyScore = numberValue(ai?.anomaly_score);
  const dailyKwh = numberValue(ai?.forecast_daily_kwh);
  const remainingKwh = numberValue(ai?.remaining_prepaid_units_kwh);
  const daysRemaining = numberValue(ai?.estimated_days_remaining);
  const averagePower = numberValue(ai?.average_power_w || live?.power_w);
  const peakPower = numberValue(ai?.peak_power_w);

  return (
    <section className="realistic-ai-panel">
      <div className="realistic-ai-header">
        <div>
          <p className="eyebrow">Smart advisory</p>
          <h3>AI Energy Recommendation</h3>
          <p>
            This recommendation is generated from the meter’s live readings,
            historical consumption pattern, prepaid balance, and power-quality behavior.
          </p>
        </div>

        <div className={`ai-risk-pill ${riskClass}`}>
          <BrainCircuit size={18} />
          <span>{risk.toUpperCase()}</span>
        </div>
      </div>

      <div className="realistic-ai-grid">
        <article className="ai-advice-card primary">
          <div className="ai-card-title">
            <Lightbulb size={19} />
            <strong>Recommended Action</strong>
          </div>
          <p>{advisory.action}</p>
        </article>

        <article className="ai-advice-card">
          <div className="ai-card-title">
            <ShieldAlert size={19} />
            <strong>Likely Reason</strong>
          </div>
          <p>{advisory.reason}</p>
        </article>

        <article className="ai-advice-card">
          <div className="ai-card-title">
            <Clock size={19} />
            <strong>Next Check</strong>
          </div>
          <p>{advisory.next}</p>
        </article>
      </div>

      <div className="realistic-ai-metrics">
        <div>
          <Activity size={18} />
          <span>Anomaly Score</span>
          <strong>{formatNumber(anomalyScore, 2)}</strong>
        </div>

        <div>
          <Zap size={18} />
          <span>Forecast / Day</span>
          <strong>{formatNumber(dailyKwh, 3)} kWh</strong>
        </div>

        <div>
          <Zap size={18} />
          <span>Average Power</span>
          <strong>{formatNumber(averagePower, 1)} W</strong>
        </div>

        <div>
          <Zap size={18} />
          <span>Peak Power</span>
          <strong>{formatNumber(peakPower, 1)} W</strong>
        </div>

        <div>
          <Zap size={18} />
          <span>Remaining Units</span>
          <strong>{formatNumber(remainingKwh, 2)} kWh</strong>
        </div>

        <div>
          <Clock size={18} />
          <span>Estimated Days</span>
          <strong>{daysRemaining > 10000 ? "Long-term" : formatNumber(daysRemaining, 1)}</strong>
        </div>
      </div>

      <div className="realistic-ai-footer">
        <span>Last AI update: {formatTime(ai?.updated_at)}</span>
        <span>Meter: Main Smart Energy Meter</span>
      </div>
    </section>
  );
}
