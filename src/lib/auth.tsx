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
import { api, ApiError, type ApiUser, type PublicConfig } from './api';
import {
  IAP_PRODUCT_ID,
  iapAvailable,
  iapCurrentEntitlements,
  iapManage,
  iapPurchase,
  iapRestore,
  type IapTransaction,
} from './iap';

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
  restore: () => Promise<void>;
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

  const applyTransactions = useCallback(async (transactions: IapTransaction[]) => {
    const jwsList = transactions.map((item) => item.jws).filter(Boolean);
    if (jwsList.length === 0) return false;
    try {
      setUser(await api.iapVerify(jwsList));
      return true;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (!iapAvailable || !user) return;
    let active = true;
    void iapCurrentEntitlements()
      .then((transactions) => {
        if (active && transactions.length > 0) return applyTransactions(transactions);
        return undefined;
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
    // Only re-check when the signed-in account changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, applyTransactions]);

  const subscribe = useCallback(async () => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    if (iapAvailable) {
      try {
        const result = await iapPurchase(user.id);
        if (!result) {
          setNotice(t.auth.storeUnavailable);
          return;
        }
        if (result.status === 'cancelled') return;
        if (result.status === 'pending') {
          setNotice(t.auth.purchasePending);
          return;
        }
        const applied = result.jws
          ? await applyTransactions([
              {
                transactionId: result.transactionId ?? '',
                productId: result.productId ?? IAP_PRODUCT_ID,
                jws: result.jws,
              },
            ])
          : false;
        setNotice(applied ? t.auth.purchaseSuccess : t.auth.purchaseFailed);
      } catch {
        setNotice(t.auth.purchaseFailed);
      }
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
  }, [applyTransactions, user, t]);

  const manage = useCallback(async () => {
    if (iapAvailable) {
      const opened = await iapManage();
      if (!opened) setNotice(t.auth.storeUnavailable);
      return;
    }
    try {
      const { url } = await api.portal();
      window.location.assign(url);
    } catch {
      setNotice(t.auth.errorGeneric);
    }
  }, [t]);

  const restore = useCallback(async () => {
    if (!iapAvailable) return;
    try {
      const transactions = await iapRestore();
      const applied = await applyTransactions(transactions);
      setNotice(applied ? t.auth.restoreSuccess : t.auth.restoreEmpty);
    } catch {
      setNotice(t.auth.purchaseFailed);
    }
  }, [applyTransactions, t]);

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
      restore,
    }),
    [user, config, loading, authOpen, notice, register, login, logout, refresh, subscribe, manage, restore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
}
