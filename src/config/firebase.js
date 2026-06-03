// Centralized Firebase config and helpers
// Use environment variables for production. Defaults are fallbacks for local dev only.
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByChild, limitToLast, set } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'REPLACE_WITH_YOUR_API_KEY',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'REPLACE_WITH_YOUR_AUTH_DOMAIN',
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || 'REPLACE_WITH_YOUR_DATABASE_URL',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'REPLACE_WITH_YOUR_PROJECT_ID',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'REPLACE_WITH_YOUR_STORAGE_BUCKET',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || 'REPLACE_WITH_YOUR_SENDER_ID',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || 'REPLACE_WITH_YOUR_APP_ID',
};

// Initialize app
const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);

// Best practice: sign in anonymously for read-only clients when applicable.
signInAnonymously(auth).catch(() => {
  // swallow error in client; apps should surface auth errors where appropriate
});

// Realtime helpers
export const subscribeToLiveData = (callback, onError) => {
  const liveRef = ref(db, 'live');
  return onValue(liveRef, (snapshot) => {
    if (snapshot.exists()) callback(snapshot.val());
  }, (error) => onError?.(error));
};

export const subscribeToAIData = (callback, onError) => {
  const aiRef = ref(db, 'ai_output');
  return onValue(aiRef, (snapshot) => {
    if (snapshot.exists()) callback(snapshot.val());
  }, (error) => onError?.(error));
};

export const fetchHistoryData = async (limit = 288) => new Promise((resolve, reject) => {
  const historyRef = query(ref(db, 'history'), orderByChild('ts'), limitToLast(limit));
  onValue(historyRef, (snapshot) => {
    if (!snapshot.exists()) { resolve([]); return; }
    const data = [];
    snapshot.forEach((child) => data.push(child.val()));
    data.sort((a, b) => (a.ts || 0) - (b.ts || 0));
    resolve(data);
  }, reject);
});

export const fetchEventLog = async (limit = 50) => new Promise((resolve, reject) => {
  const eventsRef = query(ref(db, 'events'), orderByChild('ts'), limitToLast(limit));
  onValue(eventsRef, (snapshot) => {
    if (!snapshot.exists()) { resolve([]); return; }
    const data = [];
    snapshot.forEach((child) => data.push(child.val()));
    data.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    resolve(data);
  }, reject);
});

export const setRelayCommand = async (zone, value) => {
  await set(ref(db, `relay_commands/z${zone}`), value);
  return true;
};

export const getRelayCommands = async () => new Promise((resolve, reject) => {
  onValue(ref(db, 'relay_commands'), (snapshot) => {
    resolve(snapshot.exists() ? snapshot.val() : { z1: true, z2: true, z3: true, z4: true });
  }, reject);
});

export default { db, auth, subscribeToLiveData, subscribeToAIData, fetchHistoryData, fetchEventLog, setRelayCommand, getRelayCommands };
