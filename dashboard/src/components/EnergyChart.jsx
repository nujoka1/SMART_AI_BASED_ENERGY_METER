import React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function SmartTooltip({ active, payload, label }) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((item) => (
        <div className="chart-tooltip-row" key={item.dataKey}>
          <span>{item.name}</span>
          <strong>
            {Number(item.value || 0).toFixed(item.payload?.decimals?.[item.dataKey] ?? 2)}
            {item.payload?.units?.[item.dataKey] ? ` ${item.payload.units[item.dataKey]}` : ""}
          </strong>
        </div>
      ))}
    </div>
  );
}

export default function EnergyChart({
  title,
  subtitle,
  data = [],
  series = [],
  height = 320,
  type = "line",
}) {
  const hasData = Array.isArray(data) && data.length > 1;

  return (
    <section className="chart-card">
      <div className="chart-card-header">
        <div>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </div>
      </div>

      <div style={{ width: "100%", height }}>
        {!hasData ? (
          <div className="empty-chart">
            Waiting for history data from Firebase...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {type === "area" ? (
              <AreaChart data={data} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
                <defs>
                  {series.map((item, index) => (
                    <linearGradient key={item.key} id={`fill-${item.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={`var(--chart-${index + 1})`} stopOpacity={0.35} />
                      <stop offset="95%" stopColor={`var(--chart-${index + 1})`} stopOpacity={0.03} />
                    </linearGradient>
                  ))}
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} minTickGap={22} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={42} />
                <Tooltip content={<SmartTooltip />} />
                <Legend />

                {series.map((item, index) => (
                  <Area
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke={`var(--chart-${index + 1})`}
                    fill={`url(#fill-${item.key})`}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </AreaChart>
            ) : (
              <LineChart data={data} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                <XAxis dataKey="label" tick={{ fill: "#94a3b8", fontSize: 11 }} minTickGap={22} />
                <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} width={42} />
                <Tooltip content={<SmartTooltip />} />
                <Legend />

                {series.map((item, index) => (
                  <Line
                    key={item.key}
                    type="monotone"
                    dataKey={item.key}
                    name={item.name}
                    stroke={`var(--chart-${index + 1})`}
                    strokeWidth={2.2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
