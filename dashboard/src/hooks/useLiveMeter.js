import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";

export function useLiveMeter(deviceId = DEVICE_ID) {
  const [data, setData] = useState(null);
  const [lastReceivedAt, setLastReceivedAt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError("");

    const liveRef = ref(db, paths.live(deviceId));

    const unsubscribe = onValue(
      liveRef,
      (snapshot) => {
        setData(snapshot.val());
        setLastReceivedAt(Date.now());
        setConnected(snapshot.exists());
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not read live meter data.");
        setConnected(false);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId]);

  return {
    live: data,
    lastReceivedAt,
    loading,
    error,
    connected,
  };
}
