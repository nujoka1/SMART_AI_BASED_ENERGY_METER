import React, { useMemo } from "react";
import EnergyChart from "../components/EnergyChart";
import { useHistory } from "../hooks/useHistory";
import { useDevice } from "../context/DeviceContext";

function buildChartData(history) {
  return history.map((row, index) => ({
    label: `${index + 1}`,
    voltage: Number(row.voltage_v || 0),
    current: Number(row.current_a || 0),
    power: Number(row.power_w || 0),
    powerFactor: Number(row.power_factor || 0),
    energy: Number(row.energy_kwh || 0),
    units: {
      voltage: "V",
      current: "A",
      power: "W",
      powerFactor: "",
      energy: "kWh",
    },
    decimals: {
      voltage: 1,
      current: 3,
      power: 1,
      powerFactor: 2,
      energy: 3,
    },
  }));
}

export default function Analytics() {
  const { deviceId } = useDevice();
  const { history } = useHistory(deviceId, 200);
  const chartData = useMemo(() => buildChartData(history), [history]);

  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Analytics</p>
          <h1>Energy trends</h1>
          <p className="hero-subtitle">
            Real Firebase history for the selected device: {deviceId}
          </p>
        </div>
      </section>

      <div className="main-column">
        <EnergyChart
          title="Power consumption trend"
          subtitle="Active power from Firebase history."
          data={chartData}
          type="area"
          series={[{ key: "power", name: "Power" }]}
        />

        <EnergyChart
          title="Voltage trend"
          subtitle="RMS voltage movement over recent readings."
          data={chartData}
          type="line"
          series={[{ key: "voltage", name: "Voltage" }]}
        />

        <EnergyChart
          title="Current and power factor"
          subtitle="Load current and power quality trend."
          data={chartData}
          type="line"
          series={[
            { key: "current", name: "Current" },
            { key: "powerFactor", name: "Power factor" },
          ]}
        />

        <EnergyChart
          title="Cumulative energy"
          subtitle="PZEM cumulative kWh reading."
          data={chartData}
          type="area"
          series={[{ key: "energy", name: "Energy" }]}
        />
      </div>
    </main>
  );
}
