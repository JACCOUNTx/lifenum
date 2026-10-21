import type { D1Database } from '@cloudflare/workers-types';

export interface Env {
  DB: D1Database;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  REVENUECAT_WEBHOOK_TOKEN?: string;
  APP_URL?: string;
  ADMIN_EMAIL?: string;
}

export interface Ctx {
  request: Request;
  env: Env;
  params: Record<string, string>;
}

export interface UserJoinRow {
  id: string;
  email: string;
  name: string | null;
  birth_date: string | null;
  role: string;
  password_hash?: string;
  sub_status: string | null;
  sub_end: number | null;
}

export interface Membership {
  active: boolean;
  status: string | null;
  currentPeriodEnd: number | null;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  birthDate: string | null;
  role: string;
  membership: Membership;
}

export interface Settings {
  priceCents: number;
  currency: string;
  stripePriceId: string | null;
  stripePriceAmount: number | null;
  stripePriceCurrency: string | null;
}

export const SESSION_COOKIE = 'lifenum_session';
export const SESSION_TTL = 60 * 60 * 24 * 30;
export const CURRENCIES = ['HKD', 'TWD', 'CNY', 'USD'];

const encoder = new TextEncoder();

export function json(data: unknown, status = 200, headers: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers },
  });
}

export function fail(code: string, status = 400): Response {
  return json({ error: code }, status);
}

export async function readBody<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}

export function base64Url(bytes: Uint8Array): string {
  let raw = '';
  for (const byte of bytes) raw += String.fromCharCode(byte);
  return btoa(raw).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function randomToken(bytes = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return base64Url(buffer);
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
}

export async function hashPassword(password: string): Promise<string> {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const bits = await derive(password, salt, 100_000);
  return `pbkdf2$100000$${btoa(String.fromCharCode(...salt))}$${btoa(
    String.fromCharCode(...new Uint8Array(bits)),
  )}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterationText, saltText, hashText] = stored.split('$');
  if (scheme !== 'pbkdf2' || !saltText || !hashText) return false;
  const salt = Uint8Array.from(atob(saltText), (char) => char.charCodeAt(0));
  const iterations = Number(iterationText) || 100_000;
  if (!Number.isInteger(iterations) || iterations < 1 || iterations > 100_000) return false;
  const bits = await derive(password, salt, iterations);
  const actual = new Uint8Array(bits);
  const expected = Uint8Array.from(atob(hashText), (char) => char.charCodeAt(0));
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let index = 0; index < actual.length; index += 1) diff |= actual[index] ^ expected[index];
  return diff === 0;
}

export function cookieValue(request: Request, name: string): string | null {
  const header = request.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return null;
}

export function bearerToken(request: Request): string | null {
  const header = request.headers.get('Authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}

export function sessionCookie(request: Request, token: string, maxAge = SESSION_TTL): string {
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return `${SESSION_COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}

export function toSessionUser(row: UserJoinRow): SessionUser {
  const now = Math.floor(Date.now() / 1000);
  const active =
    row.role === 'admin' ||
    (['active', 'trialing'].includes(row.sub_status ?? '') && (row.sub_end ?? 0) > now);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    birthDate: row.birth_date,
    role: row.role,
    membership: {
      active,
      status: row.sub_status ?? null,
      currentPeriodEnd: row.sub_end ?? null,
    },
  };
}

export async function getUserById(env: Env, id: string): Promise<SessionUser | null> {
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.birth_date, u.role,
            s.status AS sub_status, s.current_period_end AS sub_end
       FROM users u
       LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE u.id = ?`,
  )
    .bind(id)
    .first<UserJoinRow>();
  return row ? toSessionUser(row) : null;
}

export async function createSession(env: Env, userId: string): Promise<string> {
  const token = randomToken();
  const tokenHash = await sha256(token);
  const expires = Math.floor(Date.now() / 1000) + SESSION_TTL;
  await env.DB.prepare(
    'INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)',
  )
    .bind(tokenHash, userId, expires, new Date().toISOString())
    .run();
  return token;
}

export async function currentUser(request: Request, env: Env): Promise<SessionUser | null> {
  const token = bearerToken(request) ?? cookieValue(request, SESSION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.birth_date, u.role,
            s.status AS sub_status, s.current_period_end AS sub_end
       FROM sessions se
       JOIN users u ON u.id = se.user_id
       LEFT JOIN subscriptions s ON s.user_id = u.id
      WHERE se.token_hash = ? AND se.expires_at > ?`,
  )
    .bind(tokenHash, now)
    .first<UserJoinRow>();
  return row ? toSessionUser(row) : null;
}

export async function requireUser(request: Request, env: Env): Promise<SessionUser | Response> {
  const user = await currentUser(request, env);
  return user ?? fail('UNAUTHORIZED', 401);
}

export async function requireAdmin(request: Request, env: Env): Promise<SessionUser | Response> {
  const user = await requireUser(request, env);
  if (user instanceof Response) return user;
  return user.role === 'admin' ? user : fail('FORBIDDEN', 403);
}

export async function getSettings(env: Env): Promise<Settings> {
  const result = await env.DB.prepare('SELECT key, value FROM settings').all<{
    key: string;
    value: string;
  }>();
  const map = new Map(result.results.map((row) => [row.key, row.value]));
  return {
    priceCents: Number(map.get('price_cents') ?? 8800),
    currency: map.get('currency') ?? 'HKD',
    stripePriceId: map.get('stripe_price_id') ?? null,
    stripePriceAmount: map.get('stripe_price_amount')
      ? Number(map.get('stripe_price_amount'))
      : null,
    stripePriceCurrency: map.get('stripe_price_currency') ?? null,
  };
}

export async function setSetting(env: Env, key: string, value: string): Promise<void> {
  await env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  )
    .bind(key, value)
    .run();
}

export async function getSetting(env: Env, key: string): Promise<string | null> {
  const row = await env.DB.prepare('SELECT value FROM settings WHERE key = ?')
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function ensurePortalConfig(env: Env, base: string): Promise<string> {
  const existing = await getSetting(env, 'stripe_portal_config');
  if (existing) return existing;
  const config = await stripeRequest(env, 'POST', '/billing_portal/configurations', {
    default_return_url: base,
    features: {
      customer_update: { enabled: true, allowed_updates: ['email', 'address'] },
      invoice_history: { enabled: true },
      payment_method_update: { enabled: true },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
    },
  });
  await setSetting(env, 'stripe_portal_config', String(config.id));
  return String(config.id);
}

function encodeParams(
  input: Record<string, unknown>,
  prefix = '',
  output: string[] = [],
): string {
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(value)) {
      value.forEach((item, index) => encodeParams({ [index]: item }, name, output));
    } else if (typeof value === 'object') {
      encodeParams(value as Record<string, unknown>, name, output);
    } else {
      output.push(`${encodeURIComponent(name)}=${encodeURIComponent(String(value))}`);
    }
  }
  return output.join('&');
}

export async function stripeRequest(
  env: Env,
  method: string,
  path: string,
  params?: Record<string, unknown>,
): Promise<Record<string, any>> {
  const apiKey = env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) throw new Error('STRIPE_NOT_CONFIGURED');
  const endpoint = path.replace(/^\/v1(?=\/)/, '');
  const response = await fetch(`https://api.stripe.com/v1${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params ? encodeParams(params) : undefined,
  });
  const data = (await response.json()) as Record<string, any>;
  if (!response.ok) {
    throw new Error(data?.error?.message ?? 'STRIPE_ERROR');
  }
  return data;
}

export async function ensureStripePrice(env: Env, settings: Settings): Promise<string> {
  if (
    settings.stripePriceId &&
    settings.stripePriceAmount === settings.priceCents &&
    settings.stripePriceCurrency === settings.currency
  ) {
    return settings.stripePriceId;
  }
  const price = await stripeRequest(env, 'POST', '/prices', {
    currency: settings.currency.toLowerCase(),
    unit_amount: settings.priceCents,
    recurring: { interval: 'month' },
    product_data: { name: 'LifeNum Membership' },
  });
  await setSetting(env, 'stripe_price_id', String(price.id));
  await setSetting(env, 'stripe_price_amount', String(settings.priceCents));
  await setSetting(env, 'stripe_price_currency', settings.currency);
  return String(price.id);
}

export async function upsertStoreSubscription(
  env: Env,
  userId: string,
  status: string,
  currentPeriodEnd: number | null,
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO subscriptions (user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
     VALUES (?, ?, NULL, NULL, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       status = excluded.status,
       current_period_end = excluded.current_period_end,
       updated_at = excluded.updated_at`,
  )
    .bind(userId, status, currentPeriodEnd, new Date().toISOString())
    .run();
}

export async function verifyStripeSignature(
  payload: string,
  header: string | null,
  secret: string,
): Promise<boolean> {
  if (!header) return false;
  const parts: Record<string, string[]> = {};
  for (const chunk of header.split(',')) {
    const [key, value] = chunk.split('=');
    if (!key || !value) continue;
    (parts[key] ??= []).push(value);
  }
  const timestamp = Number(parts.t?.[0]);
  if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${timestamp}.${payload}`),
  );
  const expected = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
  return (parts.v1 ?? []).some((candidate) => candidate === expected);
}

export async function upsertSubscription(
  env: Env,
  subscription: Record<string, any>,
  userId?: string,
): Promise<void> {
  const owner = userId ?? subscription?.metadata?.user_id;
  if (!owner) return;
  await env.DB.prepare(
    `INSERT INTO subscriptions (user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET
       status = excluded.status,
       stripe_customer_id = excluded.stripe_customer_id,
       stripe_subscription_id = excluded.stripe_subscription_id,
       current_period_end = excluded.current_period_end,
       updated_at = excluded.updated_at`,
  )
    .bind(
      owner,
      subscription.status ?? null,
      subscription.customer ?? null,
      subscription.id ?? null,
      subscription.current_period_end ?? null,
      new Date().toISOString(),
    )
    .run();
}

export async function appUrl(request: Request, env: Env): Promise<string> {
  return (env.APP_URL ?? new URL(request.url).origin).trim().replace(/\/$/, '');
}
