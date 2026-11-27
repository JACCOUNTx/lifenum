export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
  ) {
    super(code);
  }
}

export interface Membership {
  active: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string | null;
  birthDate: string | null;
  role: 'member' | 'admin';
  membership: Membership;
}

export interface PublicConfig {
  priceCents: number;
  currency: string;
  stripeConfigured: boolean;
}

export interface DailyContent {
  headline: string | null;
  summary: string | null;
  colors: string[];
  note: string | null;
}

export interface DailyEntry {
  date: string;
  published: boolean;
  content: Partial<Record<string, DailyContent>>;
  updatedAt: string | null;
}

export interface AppRemoteConfig {
  version: number;
  notice: { enabled: boolean; text: Record<string, string>; link: string | null };
  features: Record<string, boolean>;
  texts: Record<string, Record<string, unknown>>;
  links: { privacy: string | null; terms: string | null; support: string | null };
  updatedAt: string | null;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  birth_date: string | null;
  role: string;
  created_at: string;
  status: string | null;
  current_period_end: number | null;
}

import { Capacitor } from '@capacitor/core';

const NATIVE = Capacitor.isNativePlatform();
const API_BASE = NATIVE ? 'https://lifenum.pages.dev' : '';
const TOKEN_KEY = 'lifenum.token';

export const isNativeApp = NATIVE;

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  if (NATIVE) {
    headers.set('X-Client-Platform', 'native');
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: NATIVE ? 'omit' : 'same-origin',
    headers,
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    throw new ApiError(typeof data.error === 'string' ? data.error : 'ERROR', response.status);
  }
  return data as T;
}

export const api = {
  async me(): Promise<ApiUser | null> {
    try {
      return (await request<{ user: ApiUser }>('/api/me')).user;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null;
      throw error;
    }
  },
  config: () => request<PublicConfig>('/api/config'),
  register: (input: { email: string; password: string; name: string; birthDate: string }) =>
    request<{ user: ApiUser; token?: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((data) => {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    }),
  login: (input: { email: string; password: string }) =>
    request<{ user: ApiUser; token?: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    }).then((data) => {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    }),
  logout: async () => {
    try {
      await request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
    } finally {
      localStorage.removeItem(TOKEN_KEY);
    }
  },
  updateMe: (input: { name?: string; birthDate?: string }) =>
    request<{ user: ApiUser }>('/api/me', {
      method: 'PUT',
      body: JSON.stringify(input),
    }).then((data) => data.user),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    request<{ ok: boolean; user: ApiUser; token?: string }>('/api/auth/password', {
      method: 'PUT',
      body: JSON.stringify(input),
    }).then((data) => {
      if (data.token) localStorage.setItem(TOKEN_KEY, data.token);
      return data.user;
    }),
  deleteAccount: (password: string) =>
    request<{ ok: boolean }>('/api/me', {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    }),
  appConfig: () => request<AppRemoteConfig>('/api/app-config'),
  daily: (date: string) =>
    request<{ entry: DailyEntry | null }>(`/api/daily?date=${encodeURIComponent(date)}`).then(
      (data) => data.entry,
    ),
  adminDaily: (date: string) =>
    request<{ entry: DailyEntry | null }>(
      `/api/admin/daily?date=${encodeURIComponent(date)}`,
    ).then((data) => data.entry),
  adminDailyList: () =>
    request<{ entries: DailyEntry[] }>('/api/admin/daily').then((data) => data.entries),
  registerPush: (input: { token: string; platform?: string; locale?: string }) =>
    request<{ ok: boolean }>('/api/push/register', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  unregisterPush: (token: string) =>
    request<{ ok: boolean }>(`/api/push/register`, {
      method: 'DELETE',
      body: JSON.stringify({ token }),
    }),
  adminPushStatus: () =>
    request<{ tokens: number; configured: boolean }>('/api/admin/push'),
  adminPushSend: (input: { title: string; body: string; locale?: string }) =>
    request<{
      sent: number;
      failed: number;
      removed: number;
      targeted: number;
      failures?: { status: number; reason: string }[];
    }>('/api/admin/push', { method: 'POST', body: JSON.stringify(input) }),
  deleteDaily: (date: string) =>
    request<{ ok: boolean }>(`/api/admin/daily?date=${encodeURIComponent(date)}`, {
      method: 'DELETE',
    }),
  saveDaily: (entry: {
    date: string;
    published: boolean;
    content: Partial<Record<string, DailyContent>>;
  }) =>
    request<{ entry: DailyEntry }>('/api/admin/daily', {
      method: 'PUT',
      body: JSON.stringify(entry),
    }).then((data) => data.entry),
  adminContent: () => request<AppRemoteConfig>('/api/admin/content'),
  saveContent: (config: AppRemoteConfig) =>
    request<AppRemoteConfig>('/api/admin/content', {
      method: 'PUT',
      body: JSON.stringify(config),
    }),
  checkout: () => request<{ url: string }>('/api/checkout', { method: 'POST' }),
  portal: () => request<{ url: string }>('/api/portal', { method: 'POST' }),
  iapVerify: (transactions: string[]) =>
    request<{ user: ApiUser; status: string; currentPeriodEnd: number | null }>(
      '/api/iap/verify',
      {
        method: 'POST',
        body: JSON.stringify({ transactions }),
      },
    ).then((data) => data.user),
  adminSettings: () => request<PublicConfig>('/api/admin/settings'),
  saveSettings: (input: { price: number; currency: string }) =>
    request<PublicConfig>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  adminUsers: () =>
    request<{ users: AdminUser[] }>('/api/admin/users').then((data) => data.users),
  setMembership: (userId: string, active: boolean) =>
    request<{ user: ApiUser }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify({ userId, active }),
    }),
};

export function formatMoney(cents: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
