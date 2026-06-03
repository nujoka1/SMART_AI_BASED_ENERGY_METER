import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Home,
  Info,
  Menu,
  Settings,
  ShieldAlert,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { subscribeToAIData, subscribeToLiveData } from './firebase-config';
import DashboardPage from './pages/Dashboard';
import AnalyticsPage from './pages/Analytics';
import ControlPanel from './pages/ControlPanel';
import EventsLog from './pages/EventsLog';
import SettingsPage from './pages/Settings';
import AboutPage from './pages/About';

export default function App() {
  const [liveData, setLiveData] = useState(null);
  const [aiData, setAiData] = useState(null);
  const [online, setOnline] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribeLive = subscribeToLiveData(
      (data) => {
        setLiveData(data);
        setOnline(true);
      },
      () => setOnline(false)
    );

    const unsubscribeAI = subscribeToAIData((data) => setAiData(data));

    return () => {
      unsubscribeLive?.();
      unsubscribeAI?.();
    };
  }, []);

  const routes = useMemo(
    () => [
      { to: '/', label: 'Dashboard', icon: Home },
      { to: '/analytics', label: 'Analytics', icon: BarChart3 },
      { to: '/control', label: 'Control Panel', icon: ShieldAlert },
      { to: '/events', label: 'Events & Logs', icon: Activity },
      { to: '/settings', label: 'Settings', icon: Settings },
      { to: '/about', label: 'About', icon: Info },
    ],
    []
  );

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(180deg,_#07111f_0%,_#0f172a_100%)] text-white">
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
            <div className="flex items-center gap-3">
              <button
                className="rounded-2xl border border-white/10 bg-slate-900/80 p-2 text-slate-200 shadow-sm shadow-cyan-500/10 md:hidden"
                onClick={() => setSidebarOpen((value) => !value)}
                aria-label="Toggle navigation"
              >
                {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-cyan-400 text-slate-950 shadow-xl shadow-fuchsia-500/20">
                <AlertCircle size={20} />
              </div>
              <div>
                <div className="text-sm font-semibold tracking-wide text-white md:text-base">Power Pulse</div>
                <div className="text-xs text-cyan-200/80">Cutie energy companion</div>
              </div>
            </div>

            <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${online ? 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300' : 'border-rose-400/40 bg-rose-400/10 text-rose-300'}`}>
              {online ? <Wifi size={14} /> : <WifiOff size={14} />}
              {online ? 'Online' : 'Offline'}
            </div>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-[250px_1fr] md:px-6">
          <aside className={`${sidebarOpen ? 'block' : 'hidden'} rounded-3xl border border-white/10 bg-white/5 p-4 shadow-2xl shadow-slate-950/40 md:block`}>
            <nav className="space-y-2">
              {routes.map((route) => {
                const Icon = route.icon;
                return (
                  <NavLink
                    key={route.to}
                    to={route.to}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${isActive ? 'bg-cyan-400 text-slate-950' : 'text-slate-200 hover:bg-white/10 hover:text-white'}`
                    }
                  >
                    <Icon size={16} />
                    {route.label}
                  </NavLink>
                );
              })}
            </nav>
          </aside>

          <main className="min-w-0 rounded-3xl border border-white/10 bg-slate-950/50 p-4 shadow-2xl shadow-slate-950/40 md:p-6">
            <Routes>
              <Route path="/" element={<DashboardPage liveData={liveData} aiData={aiData} />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/control" element={<ControlPanel liveData={liveData} />} />
              <Route path="/events" element={<EventsLog />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  );
}
