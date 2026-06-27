import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  deleteUser,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { get, ref, serverTimestamp, set, update } from "firebase/database";

import { auth, db } from "../firebase";

const AuthContext = createContext(null);

function normalizeSerial(serial) {
  return String(serial || "").trim().toUpperCase();
}

async function loadUserProfile(firebaseUser) {
  if (!firebaseUser) {
    return null;
  }

  const snapshot = await get(ref(db, `users/${firebaseUser.uid}`));
  const profile = snapshot.val();

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || profile?.name || firebaseUser.email,
    role: profile?.role || "user",
    allowedDevices: profile?.allowed_devices || {},
    meterSerial: profile?.meter_serial || "",
    primaryDeviceId: profile?.primary_device_id || "",
    profile,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setAuthLoading(true);
      setAuthError("");

      try {
        setUser(firebaseUser);
        setProfile(firebaseUser ? await loadUserProfile(firebaseUser) : null);
      } catch (error) {
        console.error(error);
        setProfile(null);
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  function cleanAuthError(error) {
    if (error.code === "auth/email-already-in-use") {
      return "This email already has an account. Please sign in instead.";
    }

    if (error.code === "auth/invalid-email") {
      return "Enter a valid email address.";
    }

    if (error.code === "auth/weak-password") {
      return "Password is too weak. Use at least 6 characters.";
    }

    if (error.code === "auth/invalid-credential") {
      return "Invalid email or password.";
    }

    return error.message || "Authentication failed.";
  }

  async function refreshProfile() {
    if (!auth.currentUser) {
      setProfile(null);
      return;
    }

    setProfile(await loadUserProfile(auth.currentUser));
  }

  async function login(email, password) {
    setAuthError("");

    try {
      await signInWithEmailAndPassword(auth, email, password);
      await refreshProfile();
    } catch (error) {
      const message = cleanAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function createAccount(name, email, password, serialNumber) {
    setAuthError("");

    const serial = normalizeSerial(serialNumber);

    if (!serial) {
      throw new Error("Enter the meter serial number.");
    }

    try {
      const serialRef = ref(db, `meter_serials/${serial}`);
      const serialSnapshot = await get(serialRef);
      const meter = serialSnapshot.val();

      if (!meter) {
        throw new Error("Invalid meter serial number. Please check the serial printed on your meter.");
      }

      if (!meter.active) {
        throw new Error("This meter serial number is not active.");
      }

      if (meter.claimed || meter.owner_uid) {
        throw new Error("This meter has already been linked to another account.");
      }

      const deviceId = meter.device_id;

      if (!deviceId) {
        throw new Error("This serial number is not linked to a valid meter.");
      }

      const result = await createUserWithEmailAndPassword(auth, email, password);

      try {
        if (name) {
          await updateProfile(result.user, {
            displayName: name,
          });
        }

        await set(ref(db, `users/${result.user.uid}`), {
          uid: result.user.uid,
          name: name || "",
          email,
          role: "user",
          meter_serial: serial,
          primary_device_id: deviceId,
          allowed_devices: {
            [deviceId]: true,
          },
          created_at: serverTimestamp(),
        });

        await update(serialRef, {
          claimed: true,
          owner_uid: result.user.uid,
          owner_email: email,
          claimed_at: serverTimestamp(),
        });

        await refreshProfile();
      } catch (linkError) {
        try {
          await deleteUser(result.user);
        } catch {
          // Ignore cleanup failure.
        }

        throw new Error(
          linkError.message ||
            "Account was created but meter linking failed. Please contact admin."
        );
      }
    } catch (error) {
      const message = cleanAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  async function logout() {
    await signOut(auth);
  }

  async function resetPassword(email) {
    setAuthError("");

    if (!email) {
      throw new Error("Enter your email first.");
    }

    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      const message = cleanAuthError(error);
      setAuthError(message);
      throw new Error(message);
    }
  }

  const value = useMemo(
    () => ({
      user,
      profile,
      authLoading,
      authError,
      login,
      createAccount,
      logout,
      resetPassword,
      refreshProfile,
      isAuthenticated: Boolean(user),
      allowedDevices: profile?.allowedDevices || {},
    }),
    [user, profile, authLoading, authError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
