import React from 'react';
import { AlertCircle, Activity, Gauge, Zap, Activity as Power, Waves } from 'lucide-react';

const readMetric = (source, primaryKey, fallbackKey, defaultValue = 0) => {
  const value = source?.[primaryKey] ?? source?.[fallbackKey] ?? defaultValue;
  return Number.isFinite(Number(value)) ? Number(value) : defaultValue;
};

export default function DashboardPage({ liveData, aiData }) {
  const voltage = readMetric(liveData, 'voltage', 'v');
  const current = readMetric(liveData, 'current', 'i');
  const power = readMetric(liveData, 'power', 'w');
  const energy = readMetric(liveData, 'energy', 'kwh');
  const powerFactor = readMetric(liveData, 'power_factor', 'pf');
  const frequency = readMetric(liveData, 'frequency', 'hz');
  const loadLabel = liveData?.label || 'Normal';
  const loadColor = liveData?.color || 'emerald';
  const anomalyDetected = Boolean(liveData?.anomaly || aiData?.anomaly || aiData?.anomaly_score >= 0.6);
  const classification = aiData?.classification || liveData?.classification || null;

  if (!liveData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300">Connecting to sensor network...</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: 'Voltage', value: voltage.toFixed(1), unit: 'V', icon: Gauge, color: 'from-blue-500 to-cyan-500', ratio: voltage / 250 },
    { label: 'Current', value: current.toFixed(2), unit: 'A', icon: Zap, color: 'from-yellow-500 to-orange-500', ratio: current / 100 },
    { label: 'Power', value: power.toFixed(1), unit: 'W', icon: Power, color: 'from-red-500 to-pink-500', ratio: power / 5000 },
    { label: 'Energy', value: energy.toFixed(3), unit: 'kWh', icon: Activity, color: 'from-green-500 to-emerald-500', ratio: energy / 100 },
    { label: 'Power Factor', value: powerFactor.toFixed(3), unit: '', icon: Waves, color: 'from-purple-500 to-indigo-500', ratio: powerFactor },
    { label: 'Frequency', value: frequency.toFixed(1), unit: 'Hz', icon: Waves, color: 'from-pink-500 to-rose-500', ratio: frequency / 100 },
  ];

  const online = Boolean(liveData);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-3xl border border-cyan-500/15 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/20">
              <Gauge size={24} />
            </div>
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Power Pulse</p>
              <h2 className="text-3xl font-bold text-white">Your energy is glowing</h2>
            </div>
          </div>
          <p className="mt-4 max-w-2xl text-sm text-slate-300">
            Cute, sharp, and easy to use—this dashboard helps you keep your home energy glowing with cozy neon status and playful power cards.
          </p>
        </div>

        <div className="rounded-3xl border border-blue-500/10 bg-slate-900/70 p-6 shadow-2xl shadow-blue-500/5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-cyan-300">Current status</p>
              <p className="text-2xl font-semibold text-white">{online ? 'Connected' : 'Waiting...'}</p>
            </div>
            <div className={`rounded-2xl px-3 py-2 text-sm font-semibold ${online ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
              {online ? 'Live Mode' : 'Offline Mode'}
            </div>
          </div>
        </div>
      </div>

      {/* Anomaly Alert */}
      {anomalyDetected && (
        <div className="bg-gradient-to-r from-red-500/20 to-red-600/20 border border-red-500/50 rounded-lg p-4 flex items-start gap-3 mb-6">
          <AlertCircle size={24} className="text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-red-400 font-semibold mb-1">System Anomaly Detected</h3>
            <p className="text-red-300/80 text-sm">
              Abnormal power consumption pattern detected. Check the Analytics page for details.
            </p>
          </div>
        </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-[30px] border border-white/10 bg-slate-900/90 p-6 shadow-2xl shadow-slate-950/20 transition hover:-translate-y-1"
            >
              <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/5 blur-2xl"></div>
              <div className="relative flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-medium uppercase tracking-[0.2em] text-slate-300">{metric.label}</h3>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${metric.color} text-white shadow-lg shadow-cyan-500/15`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="relative mb-4">
                <span className="text-5xl font-extrabold text-white">{metric.value}</span>
                <span className="text-base text-slate-400 ml-2">{metric.unit}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${metric.color} transition-all duration-500`}
                  style={{ width: `${Math.max(0, Math.min(100, (metric.ratio || 0) * 100))}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Classification Panel */}
      {classification && (
        <div className="rounded-[32px] border border-fuchsia-500/10 bg-slate-900/80 p-6 shadow-2xl shadow-fuchsia-500/10">
          <h3 className="text-xl font-semibold text-white mb-4">Load Classification</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {typeof classification === 'string' ? (
              <div className="col-span-1 md:col-span-3 rounded-3xl bg-slate-800/70 p-5 border border-white/10">
                <p className="text-sm text-slate-400 mb-2">Current pattern</p>
                <p className="text-3xl font-bold text-fuchsia-300 capitalize">{classification}</p>
              </div>
            ) : (
              Object.entries(classification).map(([label, value]) => (
                <div key={label} className="rounded-3xl bg-slate-800/70 p-5 border border-white/10">
                  <p className="text-sm text-slate-400 mb-2 capitalize">{label}</p>
                  <p className="text-2xl font-bold text-cyan-300">
                    {Number.isFinite(Number(value)) ? `${(Number(value) * 100).toFixed(1)}%` : String(value)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* AI Predictions Panel */}
      {aiData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
            <h4 className="text-gray-300 font-medium mb-2">Burn Rate</h4>
            <p className="text-3xl font-bold text-orange-400">
              {readMetric(aiData, 'burn_rate_wph', 'burn_rate').toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-2">W/hour</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
            <h4 className="text-gray-300 font-medium mb-2">Depletion Time</h4>
            <p className="text-3xl font-bold text-pink-400">
              {readMetric(aiData, 'depletion_hours', 'depletion_time_hours').toFixed(1)}
            </p>
            <p className="text-xs text-gray-500 mt-2">hours remaining</p>
          </div>
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
            <h4 className="text-gray-300 font-medium mb-2">Anomaly Score</h4>
            <p className="text-3xl font-bold text-red-400">{readMetric(aiData, 'anomaly_score').toFixed(3)}</p>
            <p className="text-xs text-gray-500 mt-2">0.0 to 1.0 scale</p>
          </div>
        </div>
      )}

      {aiData && (aiData.prediction_1h || aiData.prediction_6h || aiData.advice) && (
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">Forecast and Advice</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
              <p className="text-gray-400 text-sm mb-2">1h Prediction</p>
              <p className="text-2xl font-bold text-cyan-400">{Number(aiData.prediction_1h || 0).toFixed(2)}</p>
            </div>
            <div className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
              <p className="text-gray-400 text-sm mb-2">6h Prediction</p>
              <p className="text-2xl font-bold text-cyan-400">{Number(aiData.prediction_6h || 0).toFixed(2)}</p>
            </div>
          </div>
          {aiData.advice && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">
              {aiData.advice}
            </div>
          )}
          <div className="text-xs text-gray-500">
            Status: <span className="capitalize text-white">{loadLabel}</span> · Color cue: {loadColor}
          </div>
        </div>
      )}
    </div>
  );
}
