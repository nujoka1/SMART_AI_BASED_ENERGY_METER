import React, { useEffect, useState } from "react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { useDevice } from "../context/DeviceContext";
import { paths } from "../utils/rtdbPaths";

export default function CurrentMeterBadge() {
  const { deviceId } = useDevice();
  const [name, setName] = useState("Smart Energy Meter");

  useEffect(() => {
    const deviceRef = ref(db, paths.deviceMeta(deviceId));

    const unsubscribe = onValue(deviceRef, (snapshot) => {
      const value = snapshot.val();

      setName(
        value?.display_name ||
          value?.public_name ||
          value?.name ||
          "Smart Energy Meter"
      );
    });

    return () => unsubscribe();
  }, [deviceId]);

  return <div className="topbar-badge">Active meter: {name}</div>;
}
