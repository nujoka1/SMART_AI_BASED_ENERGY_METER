import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { numberValue } from "../utils/formatters";

const PIE_COLORS = ["#22c55e", "#ef4444"];

function safeNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function PrepaidTokenPieChart({ prediction }) {
  const prepaidUnits = safeNumber(prediction?.prepaid_units_kwh);
  const remainingUnits = safeNumber(prediction?.remaining_prepaid_units_kwh);
  const usedUnits = safeNumber(prediction?.used_since_topup_kwh);

  const safeRemaining = Math.max(remainingUnits, 0);
  const safeUsed = Math.max(usedUnits, 0);

  const total = prepaidUnits > 0 ? prepaidUnits : safeRemaining + safeUsed;

  const remainingPercent = total > 0 ? (safeRemaining / total) * 100 : 0;
  const usedPercent = total > 0 ? (safeUsed / total) * 100 : 0;

  const data = [
    {
      name: "Remaining",
      value: Number(remainingPercent.toFixed(2)),
      kwh: safeRemaining,
    },
    {
      name: "Used",
      value: Number(usedPercent.toFixed(2)),
      kwh: safeUsed,
    },
  ];

  return (
    <section className="chart-card compact-chart-card">
      <div className="chart-card-header">
        <div>
          <h3>Token balance</h3>
          <p>Percentage of prepaid units remaining versus consumed.</p>
        </div>
      </div>

      <div className="pie-layout">
        <div className="pie-chart-box">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={60}
                outerRadius={92}
                paddingAngle={4}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name, item) => [
                  `${numberValue(value, 1)}% (${numberValue(item.payload.kwh, 3)} kWh)`,
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="token-stats">
          <div>
            <span>Remaining</span>
            <strong>{numberValue(safeRemaining, 3)} kWh</strong>
          </div>
          <div>
            <span>Used since top-up</span>
            <strong>{numberValue(safeUsed, 4)} kWh</strong>
          </div>
          <div>
            <span>Remaining percent</span>
            <strong>{numberValue(remainingPercent, 1)}%</strong>
          </div>
          <div>
            <span>Days remaining</span>
            <strong>{numberValue(prediction?.estimated_days_remaining, 1)} days</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ConsumptionBarChart({ summaries }) {
  const data = [
    {
      period: "Daily",
      kwh: safeNumber(summaries?.daily?.kwh_used),
      avgPower: safeNumber(summaries?.daily?.average_power_w),
    },
    {
      period: "Weekly",
      kwh: safeNumber(summaries?.weekly?.kwh_used),
      avgPower: safeNumber(summaries?.weekly?.average_power_w),
    },
    {
      period: "Monthly",
      kwh: safeNumber(summaries?.monthly?.kwh_used),
      avgPower: safeNumber(summaries?.monthly?.average_power_w),
    },
    {
      period: "Yearly",
      kwh: safeNumber(summaries?.yearly?.kwh_used),
      avgPower: safeNumber(summaries?.yearly?.average_power_w),
    },
  ];

  return (
    <section className="chart-card compact-chart-card">
      <div className="chart-card-header">
        <div>
          <h3>Consumption comparison</h3>
          <p>Daily, weekly, monthly, and yearly kWh from AI summaries.</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} margin={{ top: 10, right: 18, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
          <XAxis dataKey="period" tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <YAxis tick={{ fill: "var(--muted)", fontSize: 12 }} />
          <Tooltip
            contentStyle={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              color: "var(--text)",
            }}
            formatter={(value, name) => [
              name === "kwh" ? `${numberValue(value, 4)} kWh` : `${numberValue(value, 1)} W`,
              name === "kwh" ? "Energy used" : "Average power",
            ]}
          />
          <Legend />
          <Bar dataKey="kwh" name="Energy used" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
          <Bar dataKey="avgPower" name="Average power" fill="var(--chart-2)" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
