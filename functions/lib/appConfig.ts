import { getSetting, setSetting, type Env } from './api';

export type LocaleCode = 'zh-TW' | 'zh-CN' | 'en';

const LOCALES: LocaleCode[] = ['zh-TW', 'zh-CN', 'en'];
const MAX_PAYLOAD_BYTES = 64 * 1024;
const MAX_TEXT_DEPTH = 6;
const MAX_TEXT_KEYS = 1500;

export interface NoticeConfig {
  enabled: boolean;
  text: Partial<Record<LocaleCode, string>>;
  link: string | null;
}

export interface AppRemoteConfig {
  version: number;
  notice: NoticeConfig;
  features: Record<string, boolean>;
  texts: Partial<Record<LocaleCode, Record<string, unknown>>>;
  links: { privacy: string | null; terms: string | null; support: string | null };
  updatedAt: string | null;
}

export const DEFAULT_APP_CONFIG: AppRemoteConfig = {
  version: 0,
  notice: { enabled: false, text: {}, link: null },
  features: {},
  texts: {},
  links: { privacy: null, terms: null, support: null },
  updatedAt: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength: number): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanLink(value: unknown): string | null {
  const link = cleanString(value, 500);
  return link && /^https:\/\//i.test(link) ? link : null;
}

function cleanTextTree(
  value: unknown,
  depth: number,
  counter: { count: number },
): Record<string, unknown> | null {
  if (!isRecord(value)) return null;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (counter.count >= MAX_TEXT_KEYS) break;
    if (!/^[A-Za-z0-9_]{1,40}$/.test(key)) continue;
    counter.count += 1;
    if (typeof entry === 'string') {
      if (entry.length <= 4000) output[key] = entry;
      continue;
    }
    if (Array.isArray(entry)) {
      output[key] = entry
        .filter((item): item is string => typeof item === 'string')
        .slice(0, 50)
        .map((item) => item.slice(0, 500));
      continue;
    }
    if (depth < MAX_TEXT_DEPTH && isRecord(entry)) {
      const nested = cleanTextTree(entry, depth + 1, counter);
      if (nested) output[key] = nested;
    }
  }
  return output;
}

export function sanitizeAppConfig(input: unknown): AppRemoteConfig {
  if (!isRecord(input)) return { ...DEFAULT_APP_CONFIG };
  const config: AppRemoteConfig = {
    version: Math.max(0, Math.floor(Number(input.version) || 0)),
    updatedAt: cleanString(input.updatedAt, 40),
    notice: { enabled: false, text: {}, link: null },
    features: {},
    texts: {},
    links: { privacy: null, terms: null, support: null },
  };

  if (isRecord(input.notice)) {
    config.notice.enabled = input.notice.enabled === true;
    if (isRecord(input.notice.text)) {
      for (const locale of LOCALES) {
        const text = cleanString(input.notice.text[locale], 500);
        if (text) config.notice.text[locale] = text;
      }
    }
    config.notice.link = cleanLink(input.notice.link);
  }

  if (isRecord(input.features)) {
    for (const [key, value] of Object.entries(input.features)) {
      if (!/^[A-Za-z0-9_]{1,40}$/.test(key)) continue;
      if (typeof value === 'boolean') config.features[key] = value;
    }
  }

  if (isRecord(input.texts)) {
    for (const locale of LOCALES) {
      if (!(locale in input.texts)) continue;
      const tree = cleanTextTree(input.texts[locale], 0, { count: 0 });
      if (tree && Object.keys(tree).length > 0) config.texts[locale] = tree;
    }
  }

  if (isRecord(input.links)) {
    config.links.privacy = cleanLink(input.links.privacy);
    config.links.terms = cleanLink(input.links.terms);
    config.links.support = cleanLink(input.links.support);
  }

  return config;
}

export async function readAppConfig(env: Env): Promise<AppRemoteConfig> {
  const raw = await getSetting(env, 'app_config');
  if (!raw) return { ...DEFAULT_APP_CONFIG };
  try {
    return sanitizeAppConfig(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_CONFIG };
  }
}

export async function saveAppConfig(env: Env, input: unknown): Promise<AppRemoteConfig> {
  const clean = sanitizeAppConfig(input);
  const payload = JSON.stringify(clean);
  if (payload.length > MAX_PAYLOAD_BYTES) throw new Error('TOO_LARGE');

  const config: AppRemoteConfig = {
    ...clean,
    version: Date.now(),
    updatedAt: new Date().toISOString(),
  };
  await setSetting(env, 'app_config', JSON.stringify(config));
  return config;
}
