import React, { useMemo } from "react";
import {
  Activity,
  BatteryCharging,
  Gauge,
  PlugZap,
  RadioTower,
  Sigma,
  Zap,
} from "lucide-react";

import MetricCard from "../components/MetricCard";
import EnergyChart from "../components/EnergyChart";
import AiRecommendationCard from "../components/AiRecommendationCard";
import DeviceStatus from "../components/DeviceStatus";
import AlertTable from "../components/AlertTable";
import ConnectionBanner from "../components/ConnectionBanner";
import { ConsumptionBarChart, PrepaidTokenPieChart } from "../components/SummaryCharts";

import { useLiveMeter } from "../hooks/useLiveMeter";
import { useHistory } from "../hooks/useHistory";
import { useAiPredictions } from "../hooks/useAiPredictions";
import { useSummaries } from "../hooks/useSummaries";
import { useDeviceStatus } from "../hooks/useDeviceStatus";
import { useAlerts } from "../hooks/useAlerts";
import { useDevice } from "../context/DeviceContext";

import { formatUnit, numberValue, riskColorClass, statusLabel } from "../utils/formatters";

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

export default function Dashboard() {
  const { deviceId } = useDevice();

  const { live, loading: liveLoading, error: liveError } = useLiveMeter(deviceId);
  const { history } = useHistory(deviceId, 120);
  const { prediction } = useAiPredictions(deviceId);
  const { summaries } = useSummaries(deviceId);
  const { status } = useDeviceStatus(deviceId);
  const { alerts } = useAlerts(deviceId, 50);

  const chartData = useMemo(() => buildChartData(history), [history]);

  const daily = summaries.daily || {};
  const weekly = summaries.weekly || {};
  const monthly = summaries.monthly || {};
  const yearly = summaries.yearly || {};

  const systemStatus = live?.status || "unknown";
  const riskLevel = prediction?.risk_level || "unknown";

  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Smart AI-Based Energy Meter</p>
          <h1>Live energy monitoring dashboard</h1>
          <p className="hero-subtitle">
            Real-time PZEM readings, Firebase history, AI prediction, prepaid tracking,
            responsive energy graphs, and multi-device support.
          </p>
        </div>

        <div className="hero-status-group">
          <div className={`status-pill ${riskColorClass(systemStatus)}`}>
            <Activity size={15} />
            Firmware: {statusLabel(systemStatus)}
          </div>

          <div className={`status-pill ${riskColorClass(riskLevel)}`}>
            <Sigma size={15} />
            AI risk: {statusLabel(riskLevel)}
          </div>
        </div>
      </section>

      {liveError ? <div className="error-banner">{liveError}</div> : null}
      {liveLoading ? <div className="loading-banner">Loading live Firebase data...</div> : null}

      <ConnectionBanner live={live} status={status} />

      <section className="metric-grid">
        <MetricCard
          title="Voltage"
          value={numberValue(live?.voltage_v, 1)}
          unit="V"
          icon={Gauge}
          tone="success"
          helper="RMS supply voltage"
        />

        <MetricCard
          title="Current"
          value={numberValue(live?.current_a, 3)}
          unit="A"
          icon={Activity}
          tone="warning"
          helper="Live load current"
        />

        <MetricCard
          title="Power"
          value={numberValue(live?.power_w, 1)}
          unit="W"
          icon={Zap}
          tone="danger"
          helper="Real-time active power"
        />

        <MetricCard
          title="Energy"
          value={numberValue(live?.energy_kwh, 3)}
          unit="kWh"
          icon={BatteryCharging}
          tone="info"
          helper="PZEM cumulative energy"
        />

        <MetricCard
          title="Frequency"
          value={numberValue(live?.frequency_hz, 1)}
          unit="Hz"
          icon={RadioTower}
          tone="neutral"
          helper="AC line frequency"
        />

        <MetricCard
          title="Power factor"
          value={numberValue(live?.power_factor, 2)}
          unit=""
          icon={PlugZap}
          tone={live?.power_factor >= 0.75 ? "success" : "warning"}
          helper="Quality under meaningful load"
        />
      </section>

      <section className="dashboard-layout">
        <div className="main-column">
          <EnergyChart
            title="Live power movement"
            subtitle="Responsive graph generated from Firebase history readings."
            data={chartData}
            type="area"
            series={[{ key: "power", name: "Power" }]}
          />

          <EnergyChart
            title="Voltage, current, and power factor"
            subtitle="Multi-sensor trend from the latest stored meter history."
            data={chartData}
            type="line"
            series={[
              { key: "voltage", name: "Voltage" },
              { key: "current", name: "Current" },
              { key: "powerFactor", name: "Power factor" },
            ]}
          />

          <section className="summary-grid">
            <div className="summary-card">
              <span>Today</span>
              <strong>{formatUnit(daily.kwh_used, "kWh", 3)}</strong>
              <p>Peak: {formatUnit(daily.peak_power_w, "W", 1)}</p>
            </div>

            <div className="summary-card">
              <span>This week</span>
              <strong>{formatUnit(weekly.kwh_used, "kWh", 3)}</strong>
              <p>Samples: {weekly.sample_count || 0}</p>
            </div>

            <div className="summary-card">
              <span>This month</span>
              <strong>{formatUnit(monthly.kwh_used, "kWh", 3)}</strong>
              <p>Average: {formatUnit(monthly.average_power_w, "W", 1)}</p>
            </div>

            <div className="summary-card">
              <span>This year</span>
              <strong>{formatUnit(yearly.kwh_used, "kWh", 3)}</strong>
              <p>Cost: {numberValue(yearly.estimated_cost, 2)}</p>
            </div>
          </section>

          <section className="chart-pair-grid">
            <PrepaidTokenPieChart prediction={prediction} />
            <ConsumptionBarChart summaries={summaries} />
          </section>
        </div>

        <aside className="side-column">
          <AiRecommendationCard prediction={prediction} />

          <section className="panel-card">
            <div className="panel-title-row">
              <div>
                <p className="eyebrow">Prepaid balance</p>
                <h3>Energy units</h3>
              </div>
            </div>

            <div className="prepaid-box">
              <span>Remaining</span>
              <strong>{numberValue(prediction?.remaining_prepaid_units_kwh, 2)} kWh</strong>
              <p>
                Estimated {numberValue(prediction?.estimated_days_remaining, 1)} days remaining.
              </p>
            </div>

            <div className="prepaid-mini">
              <div>
                <span>Used since top-up</span>
                <strong>{numberValue(prediction?.used_since_topup_kwh, 4)} kWh</strong>
              </div>
              <div>
                <span>Daily forecast</span>
                <strong>{numberValue(prediction?.forecast_daily_kwh, 3)} kWh</strong>
              </div>
            </div>
          </section>

          <DeviceStatus status={status} />
          <AlertTable alerts={alerts} />
        </aside>
      </section>
    </main>
  );
}
