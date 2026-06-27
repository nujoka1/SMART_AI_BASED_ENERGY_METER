import { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { DEVICE_ID, paths } from "../utils/rtdbPaths";

export function useAiPredictions(deviceId = DEVICE_ID) {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    const predictionRef = ref(db, paths.aiPredictions(deviceId));

    const unsubscribe = onValue(
      predictionRef,
      (snapshot) => {
        setPrediction(snapshot.val());
        setLoading(false);
      },
      (err) => {
        setError(err.message || "Could not read AI prediction.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [deviceId]);

  return {
    prediction,
    loading,
    error,
  };
}
