import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useI18n } from '../i18n';
import { api, ApiError, isNativeApp, type ApiUser, type PublicConfig } from './api';

interface AuthValue {
  user: ApiUser | null;
  config: PublicConfig | null;
  loading: boolean;
  authOpen: boolean;
  notice: string | null;
  clearNotice: () => void;
  openAuth: () => void;
  closeAuth: () => void;
  register: (input: { email: string; password: string; name: string; birthDate: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  subscribe: () => Promise<void>;
  manage: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [user, setUser] = useState<ApiUser | null>(null);
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [authOpen, setAuthOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUser(await api.me());
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.all([
      api.me().then((next) => active && setUser(next)).catch(() => undefined),
      api.config().then((next) => active && setConfig(next)).catch(() => undefined),
    ]).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('checkout');
    if (!status) return;
    window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    if (status === 'success') {
      setNotice(t.auth.checkoutSuccess);
      void refresh();
    } else if (status === 'cancel') {
      setNotice(t.auth.checkoutCancel);
    }
  }, [refresh, t]);

  const register = useCallback(
    async (input: { email: string; password: string; name: string; birthDate: string }) => {
      setUser(await api.register(input));
      setAuthOpen(false);
    },
    [],
  );

  const login = useCallback(async (input: { email: string; password: string }) => {
    setUser(await api.login(input));
    setAuthOpen(false);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const subscribe = useCallback(async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (isNativeApp) {
      setNotice(t.auth.nativePurchase);
      return;
    }
    try {
      const { url } = await api.checkout();
      window.location.assign(url);
    } catch (error) {
      setNotice(
        error instanceof ApiError && error.code === 'STRIPE_NOT_CONFIGURED'
          ? t.auth.stripeMissing
          : t.auth.errorGeneric,
      );
    }
  }, [user, t]);

  const manage = useCallback(async () => {
    if (isNativeApp) {
      setNotice(t.auth.nativePurchase);
      return;
    }
    try {
      const { url } = await api.portal();
      window.location.assign(url);
    } catch {
      setNotice(t.auth.errorGeneric);
    }
  }, [t]);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      config,
      loading,
      authOpen,
      notice,
      clearNotice: () => setNotice(null),
      openAuth: () => setAuthOpen(true),
      closeAuth: () => setAuthOpen(false),
      register,
      login,
      logout,
      refresh,
      subscribe,
      manage,
    }),
    [user, config, loading, authOpen, notice, register, login, logout, refresh, subscribe, manage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
