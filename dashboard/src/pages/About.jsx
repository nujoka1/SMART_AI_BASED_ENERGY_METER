import React from "react";

export default function About() {
  return (
    <main className="dashboard-page">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">About</p>
          <h1>Smart AI-Based Energy Meter</h1>
          <p className="hero-subtitle">
            Integrated ESP32, PZEM-004T, TFT display, Firebase Realtime Database,
            Python AI engine, web dashboard, and future Android app.
          </p>
        </div>
      </section>

      <section className="panel-card">
        <h3>System architecture</h3>
        <p>
          ESP32 reads the PZEM sensor, uploads live and history data to Firebase,
          the AI engine studies the readings, and the dashboard displays live
          analytics, recommendations, summaries, prepaid balance, and alerts.
        </p>
      </section>
    </main>
  );
}
