import { fail, json, readBody, requireAdmin, type Ctx } from '../../lib/api';
import { isApnsConfigured, sendApns, shouldDropToken, type PushMessage } from '../../lib/apns';

interface Input {
  title?: string;
  body?: string;
  url?: string;
  date?: string;
}

const MAX_TARGETS = 5000;

async function tokenRows(env: Ctx['env'], locale?: string | null) {
  const query = locale
    ? 'SELECT token FROM device_tokens WHERE platform = ? AND (locale IS NULL OR locale = ?)'
    : 'SELECT token FROM device_tokens WHERE platform = ?';
  const statement = locale
    ? env.DB.prepare(query).bind('ios', locale)
    : env.DB.prepare(query).bind('ios');
  const result = await statement.all<{ token: string }>();
  return (result.results ?? []).map((row) => row.token);
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === 'GET') {
    const count = await env.DB.prepare(
      "SELECT COUNT(*) AS total FROM device_tokens WHERE platform = 'ios'",
    ).first<{ total: number }>();
    return json({ tokens: count?.total ?? 0, configured: isApnsConfigured(env) });
  }

  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!isApnsConfigured(env)) return fail('APNS_NOT_CONFIGURED', 503);

  const body = await readBody<Input & { locale?: string }>(request);
  const title = (body.title ?? '').trim().slice(0, 120);
  const text = (body.body ?? '').trim().slice(0, 500);
  if (!title || !text) return fail('INVALID_INPUT', 422);

  const locale = typeof body.locale === 'string' && body.locale.trim() ? body.locale.trim() : null;
  const tokens = (await tokenRows(env, locale)).slice(0, MAX_TARGETS);
  if (tokens.length === 0) return json({ sent: 0, failed: 0, removed: 0 });

  const message: PushMessage = {
    title,
    body: text,
    url: typeof body.url === 'string' && body.url.startsWith('https://') ? body.url : null,
    date: typeof body.date === 'string' ? body.date.slice(0, 10) : null,
  };

  let sent = 0;
  let failed = 0;
  const dead: string[] = [];
  const failures: { status: number; reason: string }[] = [];

  const chunkSize = 50;
  for (let index = 0; index < tokens.length; index += chunkSize) {
    const chunk = tokens.slice(index, index + chunkSize);
    const results = await Promise.all(chunk.map((token) => sendApns(env, token, message)));
    for (const outcome of results) {
      if (outcome.ok) {
        sent += 1;
        continue;
      }
      failed += 1;
      if (failures.length < 3) failures.push({ status: outcome.status, reason: outcome.reason });
      if (shouldDropToken(outcome)) dead.push(outcome.token);
    }
  }

  if (dead.length > 0) {
    const statements = dead.map((token) =>
      env.DB.prepare('DELETE FROM device_tokens WHERE token = ?').bind(token),
    );
    await env.DB.batch(statements);
  }

  return json({ sent, failed, removed: dead.length, targeted: tokens.length, failures });
};
