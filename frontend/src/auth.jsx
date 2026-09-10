import React, { createContext, useContext, useState, useCallback } from 'react';

// ---------------------------------------------------------------------------
// HoneyChain dummy auth. Persists the logged-in { role, userID } across visits
// in localStorage. This is a placeholder gate — any user ID is accepted; there
// is no real credential check yet. Consumer QR verification is intentionally
// NOT gated (see App routes).
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'honeychain.auth';
const AuthContext = createContext(null);

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function AuthProvider({ children }) {
  // Map of roleKey -> { userID, at } so each persona has its own dummy session.
  const [sessions, setSessions] = useState(readStored);

  const persist = useCallback((next) => {
    setSessions(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore quota */ }
  }, []);

  const login = useCallback((roleKey, userID) => {
    persist({ ...readStored(), [roleKey]: { userID: userID || 'demo-user', at: Date.now() } });
  }, [persist]);

  const logout = useCallback((roleKey) => {
    const next = { ...readStored() };
    delete next[roleKey];
    persist(next);
  }, [persist]);

  const isLoggedIn = useCallback((roleKey) => !!sessions[roleKey], [sessions]);
  const sessionFor = useCallback((roleKey) => sessions[roleKey] || null, [sessions]);

  return (
    <AuthContext.Provider value={{ sessions, login, logout, isLoggedIn, sessionFor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
