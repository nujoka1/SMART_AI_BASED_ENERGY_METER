import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  LogOut,
  Settings,
} from "lucide-react";

import Dashboard from "./pages/Dashboard";
import Analytics from "./pages/Analytics";
import Alerts from "./pages/Alerts";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/Settings";
import Guide from "./pages/Guide";
import About from "./pages/About";
import Login from "./pages/Login";

import DeviceSelector from "./components/DeviceSelector";
import CurrentMeterBadge from "./components/CurrentMeterBadge";

import { AuthProvider, useAuth } from "./context/AuthContext";
import { DeviceProvider, useDevice } from "./context/DeviceContext";

import "./styles.css";

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, component: Dashboard },
  { id: "analytics", label: "Analytics", icon: BarChart3, component: Analytics },
  { id: "alerts", label: "Alerts", icon: AlertTriangle, component: Alerts },
  { id: "reports", label: "Reports", icon: FileText, component: Reports },
  { id: "settings", label: "Settings", icon: Settings, component: SettingsPage },
  { id: "guide", label: "Guide", icon: BookOpen, component: Guide },
  { id: "about", label: "About", icon: Info, component: About },
];

function LoadingScreen() {
  return (
    <main className="login-page">
      <section className="login-card">
        <p className="eyebrow">Loading</p>
        <h1>Checking secure session...</h1>
      </section>
    </main>
  );
}

function DashboardShell() {
  const [active, setActive] = useState("overview");
  const { user, logout } = useAuth();

  const isNativeApp =
    typeof window !== "undefined" &&
    Boolean(window.Capacitor);

  useEffect(() => {
    const theme = localStorage.getItem("smart-energy-theme") || "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }, []);

  const activeItem = NAV_ITEMS.find((item) => item.id === active) || NAV_ITEMS[0];
  const ActiveComponent = activeItem.component;

  return (
    <div className={isNativeApp ? "app-shell native-app" : "app-shell"}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Home size={22} />
          </div>
          <div>
            <strong>SmartEnergy</strong>
            <span>AI Meter</span>
          </div>
        </div>

        <nav className="nav-list">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const selected = active === item.id;

            return (
              <button
                key={item.id}
                className={selected ? "nav-item active" : "nav-item"}
                onClick={() => setActive(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="content-shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Firebase authenticated system</p>
            <h2>{activeItem.label}</h2>
          </div>

          <div className="topbar-right">
            <DeviceSelector />

            <div className="user-chip">
              <span>{user?.email}</span>
              <strong>User</strong>
            </div>

            <CurrentMeterBadge />

            <button className="logout-button" onClick={logout}>
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <ActiveComponent />
      </section>
    </div>
  );
}

function AuthGate() {
  const { authLoading, isAuthenticated } = useAuth();

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <DeviceProvider>
      <DashboardShell />
    </DeviceProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}
