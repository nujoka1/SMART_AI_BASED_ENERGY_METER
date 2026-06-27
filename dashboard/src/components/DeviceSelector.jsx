import React, { useEffect, useMemo, useState } from "react";
import { MonitorSmartphone } from "lucide-react";
import { onValue, ref } from "firebase/database";

import { db } from "../firebase";
import { useAuth } from "../context/AuthContext";
import { useDevice } from "../context/DeviceContext";
import { DEFAULT_DEVICE_ID, paths } from "../utils/rtdbPaths";

function objectToDeviceList(data) {
  if (!data || typeof data !== "object") {
    return [];
  }

  return Object.entries(data).map(([id, value]) => ({
    id,
    name:
      value?.display_name ||
      value?.public_name ||
      value?.name ||
      "Smart Energy Meter",
    location: value?.location || "",
  }));
}

export default function DeviceSelector() {
  const { deviceId, setDeviceId } = useDevice();
  const { allowedDevices } = useAuth();
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    const devicesRef = ref(db, paths.devices());

    const unsubscribe = onValue(devicesRef, (snapshot) => {
      setDevices(objectToDeviceList(snapshot.val()));
    });

    return () => unsubscribe();
  }, []);

  const options = useMemo(() => {
    const allowedIds = Object.keys(allowedDevices || {});
    const filtered = devices.filter((item) => allowedIds.includes(item.id));

    if (filtered.length > 0) {
      return filtered;
    }

    if (allowedIds.length > 0) {
      return allowedIds.map((id) => ({
        id,
        name: "Linked Smart Energy Meter",
        location: "Registered meter",
      }));
    }

    return [
      {
        id: DEFAULT_DEVICE_ID,
        name: "Main Smart Energy Meter",
        location: "Registered meter",
      },
    ];
  }, [devices, allowedDevices]);

  useEffect(() => {
    if (!options.some((item) => item.id === deviceId) && options[0]) {
      setDeviceId(options[0].id);
    }
  }, [options, deviceId, setDeviceId]);

  return (
    <div className="device-selector">
      <MonitorSmartphone size={17} />
      <select
        value={deviceId}
        onChange={(event) => setDeviceId(event.target.value)}
        aria-label="Select active energy meter"
      >
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}
