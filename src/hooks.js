// ============================================================
//  hooks/useLiveData.js  — real-time /live listener
// ============================================================
import { useEffect, useState } from "react";
import { ref, onValue }        from "firebase/database";
import { db }                  from "../firebase";

export function useLiveData() {
  const [data,   setData]   = useState(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    const liveRef = ref(db, "live");
    const unsub   = onValue(liveRef, (snap) => {
      if (snap.exists()) {
        setData(snap.val());
        setOnline(true);
      } else {
        setOnline(false);
      }
    }, (err) => {
      console.error("[useLiveData]", err);
      setOnline(false);
    });
    return () => unsub();
  }, []);

  return { data, online };
}


// ============================================================
//  hooks/useAIData.js  — /ai_output listener
// ============================================================
import { useEffect, useState } from "react";
import { ref, onValue }        from "firebase/database";
import { db }                  from "../firebase";

export function useAIData() {
  const [ai, setAI] = useState(null);

  useEffect(() => {
    const aiRef = ref(db, "ai_output");
    const unsub = onValue(aiRef, (snap) => {
      if (snap.exists()) setAI(snap.val());
    });
    return () => unsub();
  }, []);

  return ai;
}


// ============================================================
//  hooks/useHistory.js  — paginated history for chart
// ============================================================
import { useEffect, useState } from "react";
import { ref, query, orderByChild, limitToLast, onValue } from "firebase/database";
import { db } from "../firebase";

export function useHistory(limit = 288) {  // 288 = 24h at 5-min intervals
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const q = query(
      ref(db, "history"),
      orderByChild("ts"),
      limitToLast(limit)
    );
    const unsub = onValue(q, (snap) => {
      if (!snap.exists()) { setHistory([]); return; }
      const arr = [];
      snap.forEach((child) => arr.push(child.val()));
      arr.sort((a, b) => a.ts - b.ts);
      setHistory(arr);
    });
    return () => unsub();
  }, [limit]);

  return history;
}


// ============================================================
//  hooks/useEvents.js  — relay trip/restore log
// ============================================================
import { useEffect, useState } from "react";
import { ref, query, orderByChild, limitToLast, onValue } from "firebase/database";
import { db } from "../firebase";

export function useEvents(limit = 20) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const q = query(
      ref(db, "events"),
      orderByChild("ts"),
      limitToLast(limit)
    );
    const unsub = onValue(q, (snap) => {
      if (!snap.exists()) { setEvents([]); return; }
      const arr = [];
      snap.forEach((child) => arr.push(child.val()));
      arr.sort((a, b) => b.ts - a.ts);   // newest first
      setEvents(arr);
    });
    return () => unsub();
  }, [limit]);

  return events;
}
