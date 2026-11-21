import { fail, json, readBody, requireUser, type Ctx } from '../../lib/api';

interface Input {
  token?: string;
  platform?: string;
  locale?: string;
}

const TOKEN_PATTERN = /^[A-Fa-f0-9]{32,200}$/;

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST' && request.method !== 'DELETE') {
    return fail('METHOD_NOT_ALLOWED', 405);
  }

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const body = await readBody<Input>(request);
  const token = (body.token ?? '').trim();
  if (!TOKEN_PATTERN.test(token)) return fail('INVALID_INPUT', 422);

  if (request.method === 'DELETE') {
    await env.DB.prepare('DELETE FROM device_tokens WHERE token = ? AND user_id = ?')
      .bind(token, user.id)
      .run();
    return json({ ok: true });
  }

  const platform = body.platform === 'android' ? 'android' : 'ios';
  const locale = typeof body.locale === 'string' ? body.locale.slice(0, 10) : null;
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO device_tokens (token, user_id, platform, locale, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(token) DO UPDATE SET
       user_id = excluded.user_id,
       platform = excluded.platform,
       locale = excluded.locale,
       updated_at = excluded.updated_at`,
  )
    .bind(token, user.id, platform, locale, now, now)
    .run();

  return json({ ok: true });
};
