import { useEffect, useMemo, useState } from "react";
import { limitToLast, onValue, orderByKey, query, ref } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";
import { objectToArray } from "../utils/formatters";

export function useHistory(deviceId = DEVICE_ID, limit = 120) {
  const [rawHistory, setRawHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const historyQuery = query(
      ref(db, paths.history(deviceId)),
      orderByKey(),
      limitToLast(limit)
    );

    const unsubscribe = onValue(
      historyQuery,
      (snapshot) => {
        setRawHistory(snapshot.val());
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not read history.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId, limit]);

  const history = useMemo(() => {
    return objectToArray(rawHistory);
  }, [rawHistory]);

  return {
    history,
    loading,
    error,
  };
}
