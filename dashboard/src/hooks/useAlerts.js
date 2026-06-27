import { useEffect, useMemo, useState } from "react";
import { limitToLast, onValue, orderByKey, query, ref } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";
import { objectToArray } from "../utils/formatters";

export function useAlerts(deviceId = DEVICE_ID, limit = 50) {
  const [rawAlerts, setRawAlerts] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const alertsQuery = query(
      ref(db, paths.alerts(deviceId)),
      orderByKey(),
      limitToLast(limit)
    );

    const unsubscribe = onValue(
      alertsQuery,
      (snapshot) => {
        setRawAlerts(snapshot.val());
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not read alerts.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId, limit]);

  const alerts = useMemo(() => {
    return objectToArray(rawAlerts).reverse();
  }, [rawAlerts]);

  return {
    alerts,
    loading,
    error,
  };
}
