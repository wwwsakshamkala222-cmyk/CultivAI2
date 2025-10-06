// src/RoutesManager.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';

import LoginPage from './LoginPage';
import SignUpPage from './SignUpPage';
import App from './App';
import "./App.css";

const RoutesManager = () => {
  const [user, setUser] = useState(null);
  const [busy, setBusy] = useState(true);
  const [processing, setProcessing] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const clearOAuthParams = () => {
    const url = new URL(window.location.href);
    ['code', 'state', 'error', 'error_description', 'iss', 'client_id'].forEach(p =>
      url.searchParams.delete(p)
    );
    const cleaned =
      url.pathname +
      (url.searchParams.toString() ? `?${url.searchParams.toString()}` : '') +
      url.hash;
    window.history.replaceState({}, '', cleaned);
  };

  const setUserFromSession = async () => {
    try {
      const s = await fetchAuthSession();
      const tokens = s?.tokens;
      if (tokens?.idToken || tokens?.accessToken) {
        try {
          const u = await getCurrentUser();
          setUser(u);
        } catch {
          setUser({ username: 'authenticated_user' });
        }
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  };

  // Retry exchanger for OAuth code -> tokens
  const tryExchange = async () => {
    setProcessing(true);
    // 6 tries: 250ms, 500ms, 750ms, 1s, 1.25s, 1.5s
    for (let i = 0; i < 6; i++) {
      const ok = await setUserFromSession();
      if (ok) {
        clearOAuthParams();
        setProcessing(false);
        setBusy(false);
        navigate('/dashboard', { replace: true });
        return;
      }
      await new Promise(r => setTimeout(r, 250 + i * 250));
    }
    // If we get here, exchange didn't finish
    console.error('OAuth code exchange did not produce tokens');
    clearOAuthParams();
    setProcessing(false);
    setBusy(false);
    navigate('/login', { replace: true });
  };

  // Hub listener (optional but helpful)
  useEffect(() => {
    const unsub = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        setUserFromSession();
      }
      if (payload.event === 'signedOut') {
        setUser(null);
      }
    });
    return () => unsub();
  }, []);

  // Main URL handling
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const hasError = params.get('error');
    const hasCode = params.get('code');

    // OAuth error -> clean and send to login
    if (hasError) {
      clearOAuthParams();
      setBusy(false);
      navigate('/login', { replace: true });
      return;
    }

    // OAuth code -> exchange with retry
    if (hasCode) {
      tryExchange();
      return;
    }

    // Normal session check
    (async () => {
      const ok = await setUserFromSession();
      setBusy(false);
      if (!ok) setUser(null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, location.pathname, navigate]);

  if (busy || processing) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        gap: 10,
        fontSize: 18
      }}>
        <div>{processing ? 'Completing Google Sign‑in…' : 'Loading…'}</div>
        {processing && (
          <div style={{ fontSize: 14, color: '#666' }}>
            Processing authentication, please wait…
          </div>
        )}
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={!user ? <LoginPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/register"
        element={!user ? <SignUpPage /> : <Navigate to="/dashboard" replace />}
      />
      <Route
        path="/dashboard"
        element={user ? <App /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/"
        element={<Navigate to={user ? '/dashboard' : '/login'} replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default RoutesManager;