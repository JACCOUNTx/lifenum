import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';

const ENABLED_KEY = 'lifenum.push-enabled';
const TOKEN_KEY = 'lifenum.push-token';

export const pushAvailable = Capacitor.getPlatform() === 'ios';

export function isPushEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== 'false';
  } catch {
    return true;
  }
}

function storedToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Storage is best-effort.
  }
}

async function uploadToken(token: string, locale: string) {
  storeToken(token);
  try {
    await api.registerPush({ token, platform: 'ios', locale });
  } catch {
    // The token is retried on the next launch.
  }
}

let listenersReady = false;
let currentLocale = 'zh-TW';

/**
 * Asks for notification permission and registers the device token with the
 * backend. Safe to call repeatedly; the OS only prompts once.
 */
export async function enablePush(locale: string): Promise<boolean> {
  if (!pushAvailable) return false;
  currentLocale = locale || currentLocale;
  try {
    localStorage.setItem(ENABLED_KEY, 'true');
  } catch {
    // ignore
  }

  const permission = await PushNotifications.checkPermissions();
  const status =
    permission.receive === 'prompt'
      ? (await PushNotifications.requestPermissions()).receive
      : permission.receive;
  if (status !== 'granted') return false;

  if (!listenersReady) {
    listenersReady = true;
    await PushNotifications.addListener('registration', (token) => {
      void uploadToken(token.value, currentLocale);
    });
    await PushNotifications.addListener('registrationError', () => {
      listenersReady = false;
    });
  }

  const cached = storedToken();
  if (cached) await uploadToken(cached, currentLocale);
  await PushNotifications.register();
  return true;
}

/** Removes the token from the backend and stops sending notifications. */
export async function disablePush(): Promise<void> {
  if (!pushAvailable) return;
  try {
    localStorage.setItem(ENABLED_KEY, 'false');
  } catch {
    // ignore
  }
  const token = storedToken();
  if (token) {
    try {
      await api.unregisterPush(token);
    } catch {
      // best-effort
    }
  }
  storeToken(null);
  try {
    await PushNotifications.unregister();
  } catch {
    // ignore
  }
}

/** Runs after sign-in so the current account owns the device token. */
export async function syncPush(locale: string): Promise<void> {
  if (!pushAvailable) return;
  if (!isPushEnabled()) {
    await disablePush();
    return;
  }
  await enablePush(locale);
}
