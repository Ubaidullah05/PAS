import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api, { getToken, setToken } from '../lib/api';
import { ROLE_HOME } from '../lib/labels';

const AppContext = createContext(null);

let toastId = 0;

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(Boolean(getToken()));
  const [toasts, setToasts] = useState([]);
  const [unread, setUnread] = useState(0);
  const timers = useRef({});

  const pushToast = useCallback((type, title, message) => {
    const id = ++toastId;
    setToasts((list) => [...list, { id, type, title, message }]);
    timers.current[id] = setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const dismissToast = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (err, fallback) => {
      const message = err?.message || fallback || 'Something went wrong. Please try again.';
      const errors = Array.isArray(err?.errors) && err.errors.length ? err.errors.join(' ') : null;
      pushToast('danger', 'We could not do that', errors || message);
    },
    [pushToast]
  );

  const refreshUnread = useCallback(async () => {
    if (!getToken()) return setUnread(0);
    try {
      const data = await api.get('/dashboard/notifications');
      setUnread(data.data.unread || 0);
    } catch {
      setUnread(0);
    }
  }, []);

  const loadMe = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setBooting(false);
      return null;
    }
    try {
      const data = await api.get('/auth/me');
      setUser(data.data.user);
      return data.data.user;
    } catch {
      setToken(null);
      setUser(null);
      return null;
    } finally {
      setBooting(false);
    }
  }, []);

  useEffect(() => {
    loadMe();
  }, [loadMe]);

  useEffect(() => {
    refreshUnread();
  }, [user, refreshUnread]);

  const login = useCallback(
    async (email, password) => {
      const data = await api.post('/auth/login', { email, password });
      setToken(data.data.token);
      setUser(data.data.user);
      pushToast('success', 'Welcome back', data.message);
      return data.data.user;
    },
    [pushToast]
  );

  const register = useCallback(
    async (payload) => {
      const data = await api.post('/auth/register', payload);
      setToken(data.data.token);
      setUser(data.data.user);
      pushToast('success', 'Account created', data.message);
      return data.data.user;
    },
    [pushToast]
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUnread(0);
    pushToast('info', 'Signed out', 'You have been signed out safely.');
  }, [pushToast]);

  const homeFor = useCallback((u) => ROLE_HOME[u?.role] || '/dashboard', []);

  const value = useMemo(
    () => ({
      user,
      booting,
      login,
      register,
      logout,
      loadMe,
      setUser,
      homeFor,
      toasts,
      pushToast,
      dismissToast,
      notify,
      unread,
      setUnread,
      refreshUnread
    }),
    [user, booting, login, register, logout, loadMe, homeFor, toasts, pushToast, dismissToast, notify, unread, refreshUnread]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
