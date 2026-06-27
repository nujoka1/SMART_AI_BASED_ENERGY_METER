import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClockAlert,
  PowerOff,
  WifiOff,
} from "lucide-react";

function toMillis(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric) || numeric <= 0) {
    return 0;
  }

  if (numeric > 1_000_000_000_000) {
    return numeric;
  }

  if (numeric > 1_000_000_000) {
    return numeric * 1000;
  }

  return 0;
}

function pickDeviceTimestamp(live, status) {
  const candidates = [
    live?.updated_at_ms,
    status?.updated_at_ms,
    live?.server_time_ms,
    status?.server_time_ms,
    live?.updated_at,
    status?.updated_at,
    live?.timestamp,
    status?.timestamp,
    status?.last_seen,
  ];

  return Math.max(...candidates.map(toMillis), 0);
}

export default function ConnectionBanner({ live, status }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 3000);
    return () => clearInterval(timer);
  }, []);

  const state = useMemo(() => {
    const deviceTimestamp = pickDeviceTimestamp(live, status);
    const ageSeconds = deviceTimestamp
      ? Math.floor((now - deviceTimestamp) / 1000)
      : 999999;

    const voltage = Number(live?.voltage_v || 0);
    const sensorStatus = String(
      status?.sensor_status || live?.sensor_status || ""
    ).toLowerCase();

    if (!deviceTimestamp) {
      return {
        type: "offline",
        title: "Connection timestamp missing",
        message:
          "Firebase has stored readings, but the ESP32 is not writing a valid updated_at_ms timestamp yet.",
        ageSeconds,
        icon: ClockAlert,
      };
    }

    if (ageSeconds > 45) {
      return {
        type: "offline",
        title: "Offline or no light",
        message:
          "No fresh ESP32 update has reached Firebase recently. Possible power outage, WiFi loss, or device power loss.",
        ageSeconds,
        icon: WifiOff,
      };
    }

    if (sensorStatus.includes("error") || sensorStatus.includes("fail")) {
      return {
        type: "warning",
        title: "Sensor warning",
        message: "ESP32 is online, but the PZEM sensor reading is not healthy.",
        ageSeconds,
        icon: AlertTriangle,
      };
    }

    if (voltage >= 0 && voltage < 50) {
      return {
        type: "danger",
        title: "No mains supply",
        message:
          "ESP32 is online, but AC voltage is very low. This indicates no light or no mains input.",
        ageSeconds,
        icon: PowerOff,
      };
    }

    return {
      type: "success",
      title: "Connected",
      message: "ESP32 is actively sending fresh readings to Firebase.",
      ageSeconds,
      icon: CheckCircle2,
    };
  }, [live, status, now]);

  const Icon = state.icon;

  return (
    <section className={`connection-banner ${state.type}`}>
      <div className="connection-icon">
        <Icon size={24} />
      </div>

      <div>
        <strong>{state.title}</strong>
        <p>{state.message}</p>
      </div>

      <span className="connection-age">
        Last ESP32 update:{" "}
        {state.ageSeconds > 9999 ? "unknown" : `${state.ageSeconds}s ago`}
      </span>
    </section>
  );
}
