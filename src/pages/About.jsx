import React from 'react';
import { Github, ExternalLink, Code2, Zap, Database, BarChart3 } from 'lucide-react';

export default function AboutPage() {
  const features = [
    {
      icon: Zap,
      title: 'Real-Time Monitoring',
      description: 'Sub-500ms latency sensor data streaming with Firebase Realtime Database',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Trend analysis, predictions, and anomaly detection powered by AI',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Database,
      title: 'Data Integration',
      description: 'Seamless Firebase integration for scalable data storage and retrieval',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: Code2,
      title: 'Modern Stack',
      description: 'Built with React, Tailwind CSS, and Recharts for responsive UI',
      color: 'from-blue-500 to-cyan-500'
    },
  ];

  const technologies = [
    { name: 'React 18', category: 'Frontend Framework' },
    { name: 'Firebase Realtime DB', category: 'Real-Time Database' },
    { name: 'Recharts', category: 'Data Visualization' },
    { name: 'Tailwind CSS', category: 'Styling' },
    { name: 'Lucide React', category: 'Icons' },
    { name: 'React Router', category: 'Navigation' },
  ];

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">About System</h2>
        <p className="text-gray-400">Smart Energy Monitoring Dashboard v1.0.0</p>
      </div>

      {/* System Overview */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-8">
        <h3 className="text-2xl font-semibold text-white mb-4">System Overview</h3>
        <p className="text-gray-300 leading-relaxed mb-4">
          The Smart AI-Based Energy Meter Dashboard is an advanced real-time monitoring and control system 
          designed for residential and institutional energy management. It combines IoT sensor integration, 
          Firebase cloud connectivity, and AI-powered analytics to provide comprehensive insight into power 
          consumption patterns and enable intelligent energy optimization.
        </p>
        <p className="text-gray-300 leading-relaxed">
          The system captures live electrical metrics including voltage, current, active power, reactive power, 
          power factor, and frequency from Arduino-based smart meter hardware, processes this data through 
          machine learning models for anomaly detection and load classification, and presents actionable 
          insights through an intuitive web dashboard with zone-based relay control.
        </p>
      </div>

      {/* Key Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature, idx) => {
          const Icon = feature.icon;
          return (
            <div
              key={idx}
              className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6"
            >
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                <Icon size={24} className="text-white" />
              </div>
              <h4 className="text-lg font-semibold text-white mb-2">{feature.title}</h4>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          );
        })}
      </div>

      {/* Technology Stack */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-6">Technology Stack</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {technologies.map((tech, idx) => (
            <div key={idx} className="bg-slate-700/50 rounded-lg p-4 border border-blue-500/10">
              <p className="text-blue-400 font-semibold text-sm">{tech.name}</p>
              <p className="text-gray-500 text-xs mt-1">{tech.category}</p>
            </div>
          ))}
        </div>
      </div>

      {/* System Capabilities */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">System Capabilities</h3>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Real-time sensor data collection from smart meter hardware</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Live dashboard with responsive metrics and status indicators</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Advanced trend analysis: 24-hour, 7-day, and 30-day power consumption</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">AI-powered anomaly detection with confidence scoring</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Load classification: identify appliance types and usage patterns</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Multi-zone relay control with manual override capability</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Comprehensive event logging with severity-based filtering</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Configurable alerts and notifications for anomalies</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-green-400 font-bold mt-1">✓</span>
            <span className="text-gray-300">Mobile-responsive design for any device</span>
          </li>
        </ul>
      </div>

      {/* Data and Privacy */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-700 border border-blue-500/20 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Data and Privacy</h3>
        <p className="text-gray-300 text-sm mb-4">
          All data is transmitted securely to Firebase Realtime Database with proper authentication. 
          Historical data is retained according to user settings with automatic archival and cleanup. 
          The system supports configurable data retention periods and automatic backups.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Data Refresh Rate</p>
            <p className="text-lg font-bold text-blue-400">Sub-500ms</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Max Retention</p>
            <p className="text-lg font-bold text-blue-400">365 Days</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Backup Frequency</p>
            <p className="text-lg font-bold text-blue-400">Daily</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-4">
            <p className="text-gray-400 text-xs mb-1">Data Points Stored</p>
            <p className="text-lg font-bold text-blue-400">100K+</p>
          </div>
        </div>
      </div>

      {/* Contact and Support */}
      <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border border-blue-500/30 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Support and Documentation</h3>
        <p className="text-gray-300 mb-6">
          For technical support, documentation, and project information, visit our repository or contact the development team.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all"
            onClick={() => window.location.href = 'https://github.com/nujoka/smart-energy-monitor'}
          >
            <Github size={20} />
            View Repository
          </button>
          <button
            className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 text-gray-300 rounded-lg font-medium hover:bg-slate-600 transition-all"
            onClick={() => window.location.href = 'https://github.com/nujoka/smart-energy-monitor#documentation'}
          >
            <ExternalLink size={20} />
            Documentation
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pt-6 border-t border-slate-700">
        <p className="text-gray-500 text-sm mb-2">Smart Energy Monitoring Dashboard v1.0.0</p>
        <p className="text-gray-600 text-xs">Built with care for intelligent energy management</p>
      </div>
    </div>
  );
}
