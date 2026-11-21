import type { Env } from './api';

const encoder = new TextEncoder();

interface ApnsEnv extends Env {
  APNS_KEY_ID?: string;
  APNS_TEAM_ID?: string;
  APNS_PRIVATE_KEY?: string;
  APNS_TOPIC?: string;
  APNS_ENVIRONMENT?: string;
}

export interface PushMessage {
  title: string;
  body: string;
  url?: string | null;
  date?: string | null;
}

export type PushOutcome =
  | { token: string; ok: true }
  | { token: string; ok: false; status: number; reason: string };

export function isApnsConfigured(env: ApnsEnv): boolean {
  return Boolean(
    env.APNS_KEY_ID?.trim() && env.APNS_TEAM_ID?.trim() && env.APNS_PRIVATE_KEY?.trim(),
  );
}

function base64Url(input: Uint8Array | string): string {
  const bytes = typeof input === 'string' ? encoder.encode(input) : input;
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToPkcs8(pem: string): Uint8Array {
  const body = pem
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s+/g, '');
  if (!body) throw new Error('APNS_KEY_INVALID');
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
}

let cachedToken: { value: string; expiresAt: number } | null = null;
let cachedKey: { keyId: string; key: CryptoKey } | null = null;

async function providerToken(env: ApnsEnv): Promise<string> {
  const keyId = env.APNS_KEY_ID!.trim();
  const teamId = env.APNS_TEAM_ID!.trim();
  const pem = env.APNS_PRIVATE_KEY!.trim();
  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && cachedToken.expiresAt - 120 > now) return cachedToken.value;

  if (!cachedKey || cachedKey.keyId !== keyId) {
    const key = await crypto.subtle.importKey(
      'pkcs8',
      pemToPkcs8(pem),
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
    cachedKey = { keyId, key };
  }

  const header = base64Url(JSON.stringify({ alg: 'ES256', kid: keyId }));
  const payload = base64Url(JSON.stringify({ iss: teamId, iat: now }));
  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cachedKey.key,
    encoder.encode(signingInput),
  );
  const token = `${signingInput}.${base64Url(new Uint8Array(signature))}`;
  cachedToken = { value: token, expiresAt: now + 45 * 60 };
  return token;
}

/**
 * Sends one alert notification through APNs. Workers use HTTP/2 for HTTPS
 * requests, which is what APNs requires.
 */
export async function sendApns(
  env: ApnsEnv,
  token: string,
  message: PushMessage,
): Promise<PushOutcome> {
  const host =
    (env.APNS_ENVIRONMENT ?? 'production') === 'sandbox'
      ? 'https://api.sandbox.push.apple.com'
      : 'https://api.push.apple.com';
  const topic = env.APNS_TOPIC?.trim() || 'com.lifenum.wuxing';

  const payload: Record<string, unknown> = {
    aps: {
      alert: { title: message.title, body: message.body },
      sound: 'default',
      'thread-id': 'lifenum-daily',
    },
  };
  if (message.url) payload.url = message.url;
  if (message.date) payload.date = message.date;

  try {
    const response = await fetch(`${host}/3/device/${token}`, {
      method: 'POST',
      headers: {
        authorization: `bearer ${await providerToken(env)}`,
        'apns-topic': topic,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (response.ok) return { token, ok: true };
    const text = await response.text().catch(() => '');
    let reason = text;
    try {
      reason = (JSON.parse(text) as { reason?: string }).reason ?? text;
    } catch {
      // keep raw text
    }
    return { token, ok: false, status: response.status, reason: reason || 'UNKNOWN' };
  } catch (error) {
    return {
      token,
      ok: false,
      status: 0,
      reason: error instanceof Error ? error.message : 'NETWORK_ERROR',
    };
  }
}

export function shouldDropToken(outcome: PushOutcome): boolean {
  return !outcome.ok && (outcome.status === 410 || outcome.reason === 'BadDeviceToken');
}
