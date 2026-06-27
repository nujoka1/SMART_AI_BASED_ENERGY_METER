import React from "react";
import { BrainCircuit, ShieldAlert } from "lucide-react";
import { numberValue, riskColorClass, statusLabel } from "../utils/formatters";

export default function AiRecommendationCard({ prediction }) {
  const risk = prediction?.risk_level || "unknown";
  const primary = prediction?.primary_event || {};

  return (
    <section className="panel-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">AI analytics</p>
          <h3>Recommendation</h3>
        </div>

        <div className={`status-pill ${riskColorClass(risk)}`}>
          <BrainCircuit size={15} />
          {statusLabel(risk)}
        </div>
      </div>

      {!prediction ? (
        <div className="empty-state">Waiting for AI engine output...</div>
      ) : (
        <>
          <div className="ai-score-box">
            <ShieldAlert size={20} />
            <div>
              <span>Anomaly score</span>
              <strong>{numberValue(prediction.anomaly_score, 3)}</strong>
            </div>
          </div>

          <p className="recommendation-text">
            {prediction.recommendation || "No recommendation yet."}
          </p>

          <div className="ai-mini-grid">
            <div>
              <span>Primary event</span>
              <strong>{statusLabel(primary.type || "normal")}</strong>
            </div>
            <div>
              <span>Daily forecast</span>
              <strong>{numberValue(prediction.forecast_daily_kwh, 3)} kWh</strong>
            </div>
            <div>
              <span>Monthly forecast</span>
              <strong>{numberValue(prediction.forecast_monthly_kwh, 2)} kWh</strong>
            </div>
            <div>
              <span>Remaining units</span>
              <strong>{numberValue(prediction.remaining_prepaid_units_kwh, 2)} kWh</strong>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
