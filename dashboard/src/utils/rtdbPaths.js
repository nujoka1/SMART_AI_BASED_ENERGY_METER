export const DEFAULT_DEVICE_ID =
  import.meta.env.VITE_DEVICE_ID || "esp32_energy_meter_01";

export const DEVICE_ID = DEFAULT_DEVICE_ID;

export const paths = {
  devices: () => "devices",
  deviceMeta: (deviceId = DEFAULT_DEVICE_ID) => `devices/${deviceId}`,

  live: (deviceId = DEFAULT_DEVICE_ID) => `live/${deviceId}`,
  history: (deviceId = DEFAULT_DEVICE_ID) => `history/${deviceId}`,
  deviceStatus: (deviceId = DEFAULT_DEVICE_ID) => `device_status/${deviceId}`,
  alerts: (deviceId = DEFAULT_DEVICE_ID) => `alerts/${deviceId}`,
  aiPredictions: (deviceId = DEFAULT_DEVICE_ID) => `ai_predictions/${deviceId}`,
  settings: (deviceId = DEFAULT_DEVICE_ID) => `settings/${deviceId}`,

  dailySummary: (deviceId = DEFAULT_DEVICE_ID) => `daily_summary/${deviceId}`,
  weeklySummary: (deviceId = DEFAULT_DEVICE_ID) => `weekly_summary/${deviceId}`,
  monthlySummary: (deviceId = DEFAULT_DEVICE_ID) => `monthly_summary/${deviceId}`,
  yearlySummary: (deviceId = DEFAULT_DEVICE_ID) => `yearly_summary/${deviceId}`,

  systemLogs: (deviceId = DEFAULT_DEVICE_ID) => `system_logs/${deviceId}`,
};
