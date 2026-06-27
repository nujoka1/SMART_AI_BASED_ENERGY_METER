import React, { useEffect, useState } from "react";
import { get, onValue, ref, update } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";
import { useLiveMeter } from "../hooks/useLiveMeter";
import { numberValue } from "../utils/formatters";

const THEMES = [
  { id: "dark", name: "Midnight dark" },
  { id: "light", name: "Executive light" },
  { id: "emerald", name: "Emerald green" },
  { id: "ocean", name: "Ocean blue" },
  { id: "rose", name: "Rose graphite" },
  { id: "graphite", name: "Classic graphite" },
];

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("smart-energy-theme", theme);
}

export default function SettingsPage() {
  const { live } = useLiveMeter();

  const [settings, setSettings] = useState(null);
  const [prepaidUnits, setPrepaidUnits] = useState("");
  const [tariff, setTariff] = useState("");
  const [theme, setTheme] = useState(
    localStorage.getItem("smart-energy-theme") || "dark"
  );

  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const settingsRef = ref(db, paths.settings(DEVICE_ID));

    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const value = snapshot.val();
      setSettings(value);

      if (value) {
        setTariff(String(value.tariff_per_kwh ?? 0));
      }
    });

    return () => unsubscribe();
  }, []);

  async function savePrepaidSettings(event) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    try {
      let currentEnergy = Number(live?.energy_kwh || 0);

      if (!currentEnergy) {
        const snapshot = await get(ref(db, `${paths.live(DEVICE_ID)}/energy_kwh`));
        currentEnergy = Number(snapshot.val() || 0);
      }

      const units = Number(prepaidUnits);
      const tariffValue = Number(tariff || 0);

      if (!Number.isFinite(units) || units <= 0) {
        throw new Error("Enter a valid prepaid unit value in kWh.");
      }

      const payload = {
        prepaid_units_kwh: units,
        prepaid_start_energy_kwh: currentEnergy,
        tariff_per_kwh: Number.isFinite(tariffValue) ? tariffValue : 0,
        prepaid_updated_at: Math.floor(Date.now() / 1000),
      };

      await update(ref(db, paths.settings(DEVICE_ID)), payload);

      const verifySnapshot = await get(ref(db, paths.settings(DEVICE_ID)));
      const verified = verifySnapshot.val();

      setMessage(
        `Saved and verified: ${verified.prepaid_units_kwh} kWh. Start energy captured at ${Number(
          verified.prepaid_start_energy_kwh
        ).toFixed(3)} kWh. AI will recalculate on its next cycle.`
      );

      setPrepaidUnits("");
    } catch (error) {
      setMessage(error.message || "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>Meter configuration</h1>
          <p className="hero-subtitle">
            Configure prepaid units, tariff, and dashboard appearance. When units
            are saved, the dashboard captures the current PZEM energy reading as
            the top-up starting point.
          </p>
        </div>
      </section>

      <section className="settings-layout">
        <section className="panel-card settings-card">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Prepaid</p>
              <h3>Add purchased units</h3>
            </div>
          </div>

          <form className="settings-form" onSubmit={savePrepaidSettings}>
            <label>
              Purchased units in kWh
              <input
                type="number"
                step="0.001"
                min="0"
                value={prepaidUnits}
                onChange={(event) => setPrepaidUnits(event.target.value)}
                placeholder="Example: 50"
              />
            </label>

            <label>
              Tariff per kWh
              <input
                type="number"
                step="0.01"
                min="0"
                value={tariff}
                onChange={(event) => setTariff(event.target.value)}
                placeholder="Example: 225"
              />
            </label>

            <div className="settings-live-box">
              <span>Current live meter energy</span>
              <strong>{numberValue(live?.energy_kwh, 3)} kWh</strong>
            </div>

            <button className="primary-button" disabled={saving}>
              {saving ? "Saving..." : "Save prepaid units"}
            </button>
          </form>

          {message ? <div className="settings-message">{message}</div> : null}
        </section>

        <section className="panel-card settings-card">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Appearance</p>
              <h3>Theme selection</h3>
            </div>
          </div>

          <div className="theme-grid">
            {THEMES.map((item) => (
              <button
                key={item.id}
                className={theme === item.id ? "theme-option active" : "theme-option"}
                onClick={() => setTheme(item.id)}
                type="button"
              >
                <span className={`theme-dot theme-${item.id}`} />
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="panel-card settings-card">
          <div className="panel-title-row">
            <div>
              <p className="eyebrow">Current Firebase settings</p>
              <h3>Verified values</h3>
            </div>
          </div>

          <div className="device-list">
            <div>
              <span>Prepaid units</span>
              <strong>{numberValue(settings?.prepaid_units_kwh, 3)} kWh</strong>
            </div>
            <div>
              <span>Start energy</span>
              <strong>{numberValue(settings?.prepaid_start_energy_kwh, 3)} kWh</strong>
            </div>
            <div>
              <span>Tariff</span>
              <strong>{numberValue(settings?.tariff_per_kwh, 2)}</strong>
            </div>
            <div>
              <span>Voltage safe range</span>
              <strong>
                {numberValue(settings?.voltage_min_safe, 0)} - {numberValue(settings?.voltage_max_safe, 0)} V
              </strong>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
