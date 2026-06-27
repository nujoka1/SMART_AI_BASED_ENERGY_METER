export function numberValue(value, decimals = 2) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return "0";
  }

  return numeric.toFixed(decimals);
}

export function formatUnit(value, unit, decimals = 2) {
  return `${numberValue(value, decimals)} ${unit}`;
}

export function formatPercent(value, decimals = 1) {
  return `${numberValue(value, decimals)}%`;
}

export function formatDateTime(value) {
  if (!value) {
    return "No timestamp";
  }

  let date;

  if (typeof value === "number") {
    if (value > 1_000_000_000_000) {
      date = new Date(value);
    } else if (value > 1_000_000_000) {
      date = new Date(value * 1000);
    } else {
      return `${value}s uptime`;
    }
  } else {
    date = new Date(value);
  }

  if (Number.isNaN(date.getTime())) {
    return "Invalid timestamp";
  }

  return date.toLocaleString();
}

export function timeAgoFromSeconds(seconds) {
  const value = Number(seconds);

  if (!Number.isFinite(value) || value <= 0) {
    return "Unknown";
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const diff = Math.max(nowSeconds - value, 0);

  if (diff < 60) {
    return `${diff}s ago`;
  }

  if (diff < 3600) {
    return `${Math.floor(diff / 60)}m ago`;
  }

  if (diff < 86400) {
    return `${Math.floor(diff / 3600)}h ago`;
  }

  return `${Math.floor(diff / 86400)}d ago`;
}

export function statusLabel(value) {
  if (!value) {
    return "unknown";
  }

  return String(value).replaceAll("_", " ");
}

export function riskColorClass(risk) {
  if (risk === "high" || risk === "critical") {
    return "danger";
  }

  if (risk === "medium" || risk === "warning") {
    return "warning";
  }

  if (risk === "low" || risk === "ok") {
    return "success";
  }

  return "muted";
}

export function objectToArray(data) {
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.entries(data).map(([id, value]) => ({
    id,
    ...(value || {}),
  }));
}
