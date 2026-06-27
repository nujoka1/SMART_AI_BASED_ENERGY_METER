import React from "react";
import AlertTable from "../components/AlertTable";
import { useAlerts } from "../hooks/useAlerts";
import { useDevice } from "../context/DeviceContext";

export default function Alerts() {
  const { deviceId } = useDevice();
  const { alerts, loading, error } = useAlerts(deviceId, 100);

  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Alerts</p>
          <h1>System events and warnings</h1>
          <p className="hero-subtitle">
            Firmware and AI-generated alerts for selected device: {deviceId}
          </p>
        </div>
      </section>

      {loading ? <div className="loading-banner">Loading alerts...</div> : null}
      {error ? <div className="error-banner">{error}</div> : null}

      <AlertTable alerts={alerts} />
    </main>
  );
}
