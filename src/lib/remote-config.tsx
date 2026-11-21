import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, type AppRemoteConfig } from './api';

export const DEFAULT_REMOTE_CONFIG: AppRemoteConfig = {
  version: 0,
  notice: { enabled: false, text: {}, link: null },
  features: {},
  texts: {},
  links: { privacy: null, terms: null, support: null },
  updatedAt: null,
};

const CACHE_KEY = 'lifenum.remote-config';
const REFRESH_INTERVAL = 60_000;

function readCache(): AppRemoteConfig | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AppRemoteConfig>;
    return {
      ...DEFAULT_REMOTE_CONFIG,
      ...parsed,
      notice: { ...DEFAULT_REMOTE_CONFIG.notice, ...(parsed.notice ?? {}) },
      links: { ...DEFAULT_REMOTE_CONFIG.links, ...(parsed.links ?? {}) },
      features: { ...(parsed.features ?? {}) },
      texts: { ...(parsed.texts ?? {}) },
    };
  } catch {
    return null;
  }
}

const RemoteConfigContext = createContext<AppRemoteConfig>(DEFAULT_REMOTE_CONFIG);

export function RemoteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppRemoteConfig>(() => readCache() ?? DEFAULT_REMOTE_CONFIG);

  useEffect(() => {
    let active = true;
    let lastLoad = 0;

    const load = async (force: boolean) => {
      if (!force && Date.now() - lastLoad < REFRESH_INTERVAL) return;
      lastLoad = Date.now();
      try {
        const next = await api.appConfig();
        if (!active || !next) return;
        setConfig(next);
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // Cache is best-effort.
        }
      } catch {
        // Keep the cached values when the network is unavailable.
      }
    };

    void load(true);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load(false);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return <RemoteConfigContext.Provider value={config}>{children}</RemoteConfigContext.Provider>;
}

export function useRemoteConfig(): AppRemoteConfig {
  return useContext(RemoteConfigContext);
}
