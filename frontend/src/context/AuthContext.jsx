import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';
import { setOnUnauthorized } from '../services/apiClient.js';
import { accessTokenStore } from '../utils/storage.js';

const AuthContext = createContext(null);

const STATUS = { LOADING: 'loading', AUTHED: 'authed', GUEST: 'guest' };

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(STATUS.LOADING);

  const bootstrap = useCallback(async () => {
    try {
      // Attempt silent refresh — if a refresh cookie exists, we get an access
      // token back, then load /auth/me.
      await authService.refresh();
      const me = await authService.me();
      setUser(me);
      setStatus(STATUS.AUTHED);
    } catch {
      accessTokenStore.clear();
      setUser(null);
      setStatus(STATUS.GUEST);
    }
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setStatus(STATUS.GUEST);
    });
    bootstrap();
  }, [bootstrap]);

  const login = useCallback(async (payload) => {
    const me = await authService.login(payload);
    setUser(me);
    setStatus(STATUS.AUTHED);
    return me;
  }, []);

  const register = useCallback(async (payload) => {
    const me = await authService.register(payload);
    setUser(me);
    setStatus(STATUS.AUTHED);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setStatus(STATUS.GUEST);
  }, []);

  const logoutAll = useCallback(async () => {
    await authService.logoutAll();
    setUser(null);
    setStatus(STATUS.GUEST);
  }, []);

  const patchMe = useCallback((patch) => {
    setUser((prev) => (prev ? { ...prev, ...patch } : prev));
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthed: status === STATUS.AUTHED,
      isLoading: status === STATUS.LOADING,
      login,
      register,
      logout,
      logoutAll,
      patchMe,
      refresh: bootstrap,
    }),
    [user, status, login, register, logout, logoutAll, patchMe, bootstrap],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
