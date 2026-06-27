import React, { createContext, useContext, useMemo, useState } from "react";
import { DEFAULT_DEVICE_ID } from "../utils/rtdbPaths";

const DeviceContext = createContext(null);

export function DeviceProvider({ children }) {
  const [deviceId, setDeviceIdState] = useState(() => {
    return localStorage.getItem("smart-energy-device-id") || DEFAULT_DEVICE_ID;
  });

  function setDeviceId(nextDeviceId) {
    const clean = String(nextDeviceId || "").trim();

    if (!clean) {
      return;
    }

    localStorage.setItem("smart-energy-device-id", clean);
    setDeviceIdState(clean);
  }

  const value = useMemo(
    () => ({
      deviceId,
      setDeviceId,
    }),
    [deviceId]
  );

  return (
    <DeviceContext.Provider value={value}>
      {children}
    </DeviceContext.Provider>
  );
}

export function useDevice() {
  const context = useContext(DeviceContext);

  if (!context) {
    throw new Error("useDevice must be used inside DeviceProvider");
  }

  return context;
}
