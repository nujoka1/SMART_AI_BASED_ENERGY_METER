// ═══════════════════════════════════════════════════════════════
// App.js — Main Dashboard Application with Multi-Page Routing
// ═══════════════════════════════════════════════════════════════

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  BarChart3, Zap, AlertCircle, Settings, Info, Home,
  Menu, X, Wifi, WifiOff, Battery, TrendingUp
} from 'lucide-react';

// Page Components
import DashboardPage from './pages/Dashboard';
import AnalyticsPage from './pages/Analytics';
import ControlPanel from './pages/ControlPanel';
import EventsLog from './pages/EventsLog';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';

// Utilities
import { subscribeToLiveData } from './firebase-config';

// ═══════════════════════════════════════════════════════════════
// Main App Component
// ═══════════════════════════════════════════════════════════════

function App() {
  const [liveData, setLiveData] = useState(null);
  const [online, setOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [anomaly, setAnomaly] = useState(false);
  const location = useLocation();

  // Subscribe to real-time data
  useEffect(() => {
    const unsubscribe = subscribeToLiveData(
      (data) => {
        setLiveData(data);
        setOnline(true);
        setAnomaly(data.anomaly || false);
      },
      () => setOnline(false)
    );
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <Header online={online} anomaly={anomaly} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex h-screen pt-16">
        {/* Sidebar Navigation */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} currentPage={location.pathname} />

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-6">
          <Routes>
            <Route path="/" element={<DashboardPage liveData={liveData} />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/control" element={<ControlPanel liveData={liveData} />} />
            <Route path="/events" element={<EventsLog />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/about" element={<AboutPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Header Component
// ═══════════════════════════════════════════════════════════════

function Header({ online, anomaly, sidebarOpen, setSidebarOpen }) {
  const current = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 border-b border-blue-700/30 shadow-xl h-16">
      <div className="flex items-center justify-between px-4 md:px-6 h-full">
        {/* Logo and Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-blue-400 hover:text-blue-300 transition"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Zap size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white hidden sm:block">Smart Energy Monitor</h1>
              <p className="text-xs text-blue-300">AI-Powered Energy Management</p>
            </div>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-4">
          {/* Anomaly Alert */}
          {anomaly && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/20 border border-red-500/50 rounded-lg animate-pulse">
              <AlertCircle size={18} className="text-red-400" />
              <span className="text-sm font-semibold text-red-400">Anomaly</span>
            </div>
          )}

          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            online
              ? 'bg-green-500/20 border border-green-500/50'
              : 'bg-red-500/20 border border-red-500/50'
          }`}>
            {online ? (
              <>
                <Wifi size={18} className="text-green-400" />
                <span className="text-sm text-green-400 hidden sm:inline">Online</span>
              </>
            ) : (
              <>
                <WifiOff size={18} className="text-red-400" />
                <span className="text-sm text-red-400 hidden sm:inline">Offline</span>
              </>
            )}
          </div>

          {/* Time Display */}
          <div className="text-sm font-mono text-blue-300 hidden md:block">{current}</div>
        </div>
      </div>
    </header>
  );
}

// ═══════════════════════════════════════════════════════════════
// Sidebar Navigation
// ═══════════════════════════════════════════════════════════════

function Sidebar({ sidebarOpen, setSidebarOpen, currentPage }) {
  const navItems = [
    { path: '/', icon: Home, label: 'Dashboard', color: 'from-blue-500 to-cyan-500' },
    { path: '/analytics', icon: TrendingUp, label: 'Analytics', color: 'from-purple-500 to-pink-500' },
    { path: '/control', icon: BarChart3, label: 'Control Panel', color: 'from-orange-500 to-red-500' },
    { path: '/events', icon: AlertCircle, label: 'Events & Logs', color: 'from-yellow-500 to-orange-500' },
    { path: '/settings', icon: Settings, label: 'Settings', color: 'from-green-500 to-emerald-500' },
    { path: '/about', icon: Info, label: 'About', color: 'from-indigo-500 to-purple-500' },
  ];

  return (
    <>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static left-0 top-16 h-[calc(100vh-64px)] w-64 bg-gradient-to-b from-slate-800 to-slate-900 border-r border-blue-700/30 transform transition-transform duration-300 z-40 overflow-y-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? `bg-gradient-to-r ${item.color} text-white shadow-lg shadow-blue-500/20`
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-700/30">
          <div className="bg-slate-700/50 rounded-lg p-3 text-xs text-slate-300">
            <p className="font-semibold text-white mb-1">System Status</p>
            <p>Version 1.0.0</p>
            <p>© 2025 Smart Energy</p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default App;
