import React, { useState } from "react";
import { Eye, EyeOff, Hash, LockKeyhole, Mail, UserPlus, Zap } from "lucide-react";

import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login, createAccount, resetPassword, authError } = useAuth();

  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const isCreateMode = mode === "create";

  async function handleSubmit(event) {
    event.preventDefault();

    setBusy(true);
    setMessage("");

    try {
      if (isCreateMode) {
        await createAccount(name.trim(), email.trim(), password, serialNumber.trim());
      } else {
        await login(email.trim(), password);
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleResetPassword() {
    setBusy(true);
    setMessage("");

    try {
      await resetPassword(email.trim());
      setMessage("Password reset email sent. Check your inbox or spam folder.");
    } catch (error) {
      setMessage(error.message || "Could not send reset email.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMessage("");
    setMode((current) => (current === "login" ? "create" : "login"));
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="login-logo">
          <Zap size={34} />
        </div>

        <p className="eyebrow">Secure meter access</p>

        <h1>{isCreateMode ? "Create meter account" : "Smart AI Energy Meter"}</h1>

        <p className="login-subtitle">
          {isCreateMode
            ? "Create an account using the serial number printed on your smart energy meter."
            : "Sign in to monitor live readings, AI predictions, prepaid units, alerts, reports, and meter settings."}
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          {isCreateMode ? (
            <label>
              Full name
              <div className="login-input-wrap">
                <UserPlus size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Joseph Nuhu"
                  autoComplete="name"
                />
              </div>
            </label>
          ) : null}

          <label>
            Email address
            <div className="login-input-wrap">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Enter your email"
                autoComplete="email"
                required
              />
            </div>
          </label>

          {isCreateMode ? (
            <label>
              Meter serial number
              <div className="login-input-wrap">
                <Hash size={18} />
                <input
                  type="text"
                  value={serialNumber}
                  onChange={(event) => setSerialNumber(event.target.value.toUpperCase())}
                  placeholder="Example: SEM-2026-0001"
                  autoComplete="off"
                  required
                />
              </div>
            </label>
          ) : null}

          <label>
            Password
            <div className="login-input-wrap">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder={isCreateMode ? "Minimum 6 characters" : "Enter your password"}
                autoComplete={isCreateMode ? "new-password" : "current-password"}
                required
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button className="primary-button login-button" disabled={busy}>
            {busy
              ? isCreateMode
                ? "Creating account..."
                : "Signing in..."
              : isCreateMode
                ? "Create and link meter"
                : "Sign in"}
          </button>

          <button
            type="button"
            className="ghost-button"
            onClick={switchMode}
            disabled={busy}
          >
            {isCreateMode
              ? "Already have an account? Sign in"
              : "Create new meter account"}
          </button>

          {!isCreateMode ? (
            <button
              type="button"
              className="ghost-button"
              onClick={handleResetPassword}
              disabled={busy}
            >
              Forgot password?
            </button>
          ) : null}
        </form>

        {message || authError ? (
          <div className="login-message">{message || authError}</div>
        ) : null}

        <p className="login-note">
          Account creation requires a valid unclaimed meter serial number. Each
          account is linked only to the meter registered with that serial number.
        </p>
      </section>
    </main>
  );
}
