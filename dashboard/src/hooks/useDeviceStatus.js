import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";

export function useDeviceStatus(deviceId = DEVICE_ID) {
  const [status, setStatus] = useState(null);
  const [lastReceivedAt, setLastReceivedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const statusRef = ref(db, paths.deviceStatus(deviceId));

    const unsubscribe = onValue(
      statusRef,
      (snapshot) => {
        setStatus(snapshot.val());
        setLastReceivedAt(Date.now());
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not read device status.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId]);

  return {
    status,
    lastReceivedAt,
    loading,
    error,
  };
}
