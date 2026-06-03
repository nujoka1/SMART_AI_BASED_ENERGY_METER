import React, { useState, useEffect } from 'react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchHistoryData } from '../firebase-config';

const normalizeField = (item, primaryKey, fallbackKey) => Number(item?.[primaryKey] ?? item?.[fallbackKey] ?? 0);

const formatLabel = (ts) => {
  const date = ts ? new Date(ts * 1000) : new Date();
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

export default function AnalyticsPage() {
  const [historyData, setHistoryData] = useState([]);
  const [timeRange, setTimeRange] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const limit = timeRange === '24h' ? 288 : timeRange === '7d' ? 2016 : 8640;
        const data = await fetchHistoryData(limit);
        
        const formatted = data.map(item => ({
          ts: formatLabel(item.ts),
          power: normalizeField(item, 'power', 'w'),
          voltage: normalizeField(item, 'voltage', 'v'),
          current: normalizeField(item, 'current', 'i'),
          energy: normalizeField(item, 'energy', 'kwh'),
        }));
        
        setHistoryData(formatted);
      } catch (error) {
        console.error('Error loading history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [timeRange]);

  const timeRanges = [
    { label: '24 Hours', value: '24h' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">Analytics & Trends</h2>
        <p className="text-gray-400">Historical data and power consumption patterns</p>
      </div>

      {/* Time Range Selection */}
      <div className="flex gap-2 mb-6">
        {timeRanges.map(range => (
          <button
            key={range.value}
            onClick={() => setTimeRange(range.value)}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              timeRange === range.value
                ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96 bg-slate-800 rounded-xl">
          <p className="text-gray-400">Loading data...</p>
        </div>
      ) : (
        <>
          {/* Power Consumption Trend */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Power Consumption Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={historyData}>
                <defs>
                  <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="ts" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Area type="monotone" dataKey="power" stroke="#f97316" fillOpacity={1} fill="url(#colorPower)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Voltage & Current Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Voltage Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="ts" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="voltage" stroke="#06b6d4" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Current Trend</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={historyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="ts" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Line type="monotone" dataKey="current" stroke="#eab308" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Energy Accumulation */}
          <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Energy Consumption Over Time</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={historyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="ts" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#cbd5e1' }} />
                <Line type="monotone" dataKey="energy" stroke="#10b981" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/10">
              <p className="text-gray-400 text-sm mb-2">Avg Power</p>
              <p className="text-2xl font-bold text-orange-400">
                {(historyData.reduce((sum, d) => sum + (d.power || 0), 0) / (historyData.length || 1)).toFixed(0)} W
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/10">
              <p className="text-gray-400 text-sm mb-2">Max Power</p>
              <p className="text-2xl font-bold text-red-400">
                {Math.max(...historyData.map(d => d.power || 0)).toFixed(0)} W
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/10">
              <p className="text-gray-400 text-sm mb-2">Min Power</p>
              <p className="text-2xl font-bold text-green-400">
                {Math.min(...historyData.map(d => d.power || 0)).toFixed(0)} W
              </p>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 border border-blue-500/10">
              <p className="text-gray-400 text-sm mb-2">Total Energy</p>
              <p className="text-2xl font-bold text-blue-400">
                {historyData[historyData.length - 1]?.energy?.toFixed(2) || '0.00'} kWh
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
