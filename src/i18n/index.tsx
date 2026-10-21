import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from 'react';
import { useStoredState } from '../lib/storage';
import { en } from './en';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';
import type { Dict, Locale } from './types';

export const DICTS: Record<Locale, Dict> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
};

export const LOCALES: Locale[] = ['zh-CN', 'zh-TW', 'en'];

/** Traditional Chinese is the default; Simplified is only picked up for Simplified Chinese systems. */
export function detectLocale(): Locale {
  const languages = typeof navigator === 'undefined' ? [] : navigator.languages ?? [navigator.language];
  const lang = (languages[0] ?? '').toLowerCase();
  if (lang.includes('hans') || lang.startsWith('zh-cn') || lang.includes('zh-sg')) {
    return 'zh-CN';
  }
  return 'zh-TW';
}

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Dict;
  tag: string;
  format: (template: string, vars: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useStoredState<Locale>('locale', detectLocale());
  const t = DICTS[locale];

  useEffect(() => {
    document.documentElement.lang = t.htmlLang;
    document.title = `${t.appName} · ${t.appSub}`;
  }, [t]);

  const format = useCallback((template: string, vars: Record<string, string | number>) => {
    return template.replace(/\{(\w+)\}/g, (_, key: string) => String(vars[key] ?? `{${key}}`));
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ locale, setLocale, t, tag: t.htmlLang, format }),
    [locale, setLocale, t, format],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
