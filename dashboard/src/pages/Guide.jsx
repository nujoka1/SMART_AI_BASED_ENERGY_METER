import React from "react";

export default function Guide() {
  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">User guide</p>
          <h1>How to use the Smart AI Energy Meter</h1>
          <p className="hero-subtitle">
            This guide explains how the ESP32 meter, TFT screen, Firebase, AI engine,
            dashboard, and prepaid unit system work together.
          </p>
        </div>
      </section>

      <section className="guide-grid">
        <article className="panel-card">
          <p className="eyebrow">Step 1</p>
          <h3>Power the meter</h3>
          <p>
            Connect the ESP32, PZEM energy sensor, and TFT display. The TFT should
            rotate through live meter pages, graphs, AI recommendation, summaries,
            and prepaid forecast pages.
          </p>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Step 2</p>
          <h3>Monitor live readings</h3>
          <p>
            The Overview page shows voltage, current, power, energy, frequency,
            power factor, device health, AI recommendation, and recent alerts.
          </p>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Step 3</p>
          <h3>Add prepaid units</h3>
          <p>
            Go to Settings, enter the purchased kWh units and tariff. The dashboard
            automatically captures the current meter energy as the starting point.
          </p>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Step 4</p>
          <h3>Run the AI engine</h3>
          <p>
            The Python AI engine studies Firebase history, detects abnormal behavior,
            forecasts daily/monthly/yearly use, and writes recommendations back to Firebase.
          </p>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Step 5</p>
          <h3>Read graphs and reports</h3>
          <p>
            Analytics uses real Firebase history to draw responsive charts. Reports
            show AI-generated daily, weekly, monthly, and yearly consumption summaries.
          </p>
        </article>

        <article className="panel-card">
          <p className="eyebrow">Step 6</p>
          <h3>Respond to alerts</h3>
          <p>
            If abnormal voltage, overload, sensor fault, or high-risk AI event occurs,
            the TFT, dashboard alerts, LED, and buzzer/alarm system can notify the user.
          </p>
        </article>
      </section>
    </main>
  );
}
