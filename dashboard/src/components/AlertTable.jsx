import React from "react";
import { AlertTriangle } from "lucide-react";
import { riskColorClass, statusLabel } from "../utils/formatters";

export default function AlertTable({ alerts = [] }) {
  return (
    <section className="panel-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Events</p>
          <h3>Recent alerts</h3>
        </div>

        <div className="status-pill muted">
          <AlertTriangle size={15} />
          {alerts.length}
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="empty-state">No alerts recorded yet.</div>
      ) : (
        <div className="alert-list">
          {alerts.slice(0, 6).map((alert) => (
            <article className="alert-row" key={alert.id}>
              <div className={`alert-dot ${riskColorClass(alert.level)}`} />
              <div>
                <strong>{statusLabel(alert.type || "event")}</strong>
                <p>{alert.message || "No message"}</p>
              </div>
              <span>{statusLabel(alert.source || "system")}</span>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
