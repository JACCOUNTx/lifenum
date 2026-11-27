import {
  createSession,
  fail,
  getUserById,
  hashPassword,
  json,
  readBody,
  requireUser,
  sessionCookie,
  verifyPassword,
  type Ctx,
} from '../../lib/api';

interface Input {
  currentPassword?: string;
  newPassword?: string;
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'PUT') return fail('METHOD_NOT_ALLOWED', 405);

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const { currentPassword, newPassword } = await readBody<Input>(request);
  if (!currentPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return fail('INVALID_INPUT', 422);
  }
  if (currentPassword === newPassword) return fail('SAME_PASSWORD', 422);

  const row = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ password_hash: string | null }>();
  if (!row?.password_hash || !(await verifyPassword(currentPassword, row.password_hash))) {
    return fail('INVALID_CREDENTIALS', 401);
  }

  const nextHash = await hashPassword(newPassword);
  await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
    .bind(nextHash, user.id)
    .run();

  // 舊 session 全部失效，再為目前裝置換發新 token。
  await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(user.id).run();
  const token = await createSession(env, user.id);

  const updated = await getUserById(env, user.id);
  if (request.headers.get('X-Client-Platform') === 'native') {
    return json({ ok: true, user: updated, token });
  }
  return json({ ok: true, user: updated }, 200, { 'Set-Cookie': sessionCookie(request, token) });
};
