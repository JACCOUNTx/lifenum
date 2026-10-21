import {
  currentUser,
  fail,
  getUserById,
  json,
  readBody,
  requireUser,
  sessionCookie,
  stripeRequest,
  verifyPassword,
  type Ctx,
} from '../lib/api';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method === 'GET') {
    const user = await currentUser(request, env);
    return user ? json({ user }) : fail('UNAUTHORIZED', 401);
  }

  if (request.method === 'PUT') {
    const user = await requireUser(request, env);
    if (user instanceof Response) return user;

    const { name, birthDate } = await readBody<{ name?: string; birthDate?: string }>(request);
    const nextName = typeof name === 'string' ? name.trim() : null;
    const nextBirth = typeof birthDate === 'string' ? birthDate.trim() : null;
    if (nextBirth && !/^\d{4}-\d{2}-\d{2}$/.test(nextBirth)) return fail('INVALID_INPUT', 422);

    await env.DB.prepare(
      'UPDATE users SET name = COALESCE(?, name), birth_date = COALESCE(?, birth_date) WHERE id = ?',
    )
      .bind(nextName, nextBirth, user.id)
      .run();

    return json({ user: await getUserById(env, user.id) });
  }

  if (request.method === 'DELETE') {
    const user = await requireUser(request, env);
    if (user instanceof Response) return user;

    const { password } = await readBody<{ password?: string }>(request);
    const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(user.id)
      .first<{ password_hash: string }>();
    if (!row || !password || !(await verifyPassword(password, row.password_hash))) {
      return fail('INVALID_CREDENTIALS', 401);
    }

    const sub = await env.DB.prepare(
      'SELECT stripe_subscription_id FROM subscriptions WHERE user_id = ?',
    )
      .bind(user.id)
      .first<{ stripe_subscription_id: string | null }>();
    if (sub?.stripe_subscription_id) {
      try {
        await stripeRequest(env, 'DELETE', `/subscriptions/${sub.stripe_subscription_id}`);
      } catch (error) {
        console.error('subscription cancel failed during account deletion', error);
      }
    }

    await env.DB.batch([
      env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM subscriptions WHERE user_id = ?').bind(user.id),
      env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ]);

    if (request.headers.get('X-Client-Platform') === 'native') return json({ ok: true });
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(request, '', 0) });
  }

  return fail('METHOD_NOT_ALLOWED', 405);
};
