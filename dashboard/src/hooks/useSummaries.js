import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";

const SUMMARY_PATHS = {
  daily: paths.dailySummary,
  weekly: paths.weeklySummary,
  monthly: paths.monthlySummary,
  yearly: paths.yearlySummary,
};

export function useSummaries(deviceId = DEVICE_ID) {
  const [summaries, setSummaries] = useState({
    daily: null,
    weekly: null,
    monthly: null,
    yearly: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribers = Object.entries(SUMMARY_PATHS).map(([period, pathBuilder]) => {
      const summaryRef = ref(db, pathBuilder(deviceId));

      return onValue(
        summaryRef,
        (snapshot) => {
          setSummaries((previous) => ({
            ...previous,
            [period]: snapshot.val(),
          }));

          setLoading(false);
        },
        (err) => {
          setError(err.message || `Could not read ${period} summary.`);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [deviceId]);

  return {
    summaries,
    loading,
    error,
  };
}
