import React from "react";
import { Cpu, Radio, Wifi } from "lucide-react";
import { numberValue, statusLabel } from "../utils/formatters";

export default function DeviceStatus({ status }) {
  const online = Boolean(status?.online);

  return (
    <section className="panel-card">
      <div className="panel-title-row">
        <div>
          <p className="eyebrow">Device health</p>
          <h3>ESP32 status</h3>
        </div>

        <div className={`status-pill ${online ? "success" : "danger"}`}>
          <Wifi size={15} />
          {online ? "Online" : "Offline"}
        </div>
      </div>

      {!status ? (
        <div className="empty-state">Waiting for device heartbeat...</div>
      ) : (
        <div className="device-list">
          <div>
            <Radio size={18} />
            <span>IP address</span>
            <strong>{status.ip || "Unknown"}</strong>
          </div>

          <div>
            <Wifi size={18} />
            <span>WiFi RSSI</span>
            <strong>{status.wifi_rssi ?? "N/A"} dBm</strong>
          </div>

          <div>
            <Cpu size={18} />
            <span>Free heap</span>
            <strong>{numberValue(status.free_heap, 0)} bytes</strong>
          </div>

          <div>
            <Cpu size={18} />
            <span>Sensor</span>
            <strong>{statusLabel(status.sensor_status || "unknown")}</strong>
          </div>

          <div>
            <Cpu size={18} />
            <span>Firmware</span>
            <strong>{status.firmware_version || "Unknown"}</strong>
          </div>

          <div>
            <Cpu size={18} />
            <span>Uptime</span>
            <strong>{numberValue(status.uptime_s, 0)} s</strong>
          </div>
        </div>
      )}
    </section>
  );
}
