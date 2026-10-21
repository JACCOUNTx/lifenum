import {
  bearerToken,
  cookieValue,
  fail,
  json,
  SESSION_COOKIE,
  sessionCookie,
  sha256,
  type Ctx,
} from '../../lib/api';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const token = bearerToken(request) ?? cookieValue(request, SESSION_COOKIE);
  if (token) {
    await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?')
      .bind(await sha256(token))
      .run();
  }

  if (request.headers.get('X-Client-Platform') === 'native') {
    return json({ ok: true });
  }
  return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
};
