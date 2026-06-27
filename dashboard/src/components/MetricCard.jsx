import React from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export default function MetricCard({
  title,
  value,
  unit,
  icon: Icon,
  tone = "neutral",
  helper = "",
  trend = "flat",
}) {
  const TrendIcon =
    trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;

  return (
    <section className={`metric-card tone-${tone}`}>
      <div className="metric-card-header">
        <div>
          <p className="metric-title">{title}</p>
          <div className="metric-value-row">
            <span className="metric-value">{value}</span>
            {unit ? <span className="metric-unit">{unit}</span> : null}
          </div>
        </div>

        <div className="metric-icon">
          {Icon ? <Icon size={22} /> : null}
        </div>
      </div>

      <div className="metric-footer">
        <span>{helper}</span>
        <TrendIcon size={16} />
      </div>
    </section>
  );
}
