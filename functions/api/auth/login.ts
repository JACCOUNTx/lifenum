import {
  createSession,
  currentUser,
  fail,
  json,
  readBody,
  sessionCookie,
  verifyPassword,
  type Ctx,
  type UserJoinRow,
} from '../../lib/api';

interface Input {
  email?: string;
  password?: string;
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const { email, password } = await readBody<Input>(request);
  const normalizedEmail = (email ?? '').trim().toLowerCase();
  if (!normalizedEmail || !password) return fail('INVALID_INPUT', 422);

  const row = await env.DB.prepare(
    'SELECT id, email, password_hash FROM users WHERE email = ?',
  )
    .bind(normalizedEmail)
    .first<Pick<UserJoinRow, 'id' | 'email' | 'password_hash'>>();

  if (!row?.password_hash) return fail('INVALID_CREDENTIALS', 401);
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return fail('INVALID_CREDENTIALS', 401);

  const token = await createSession(env, row.id);
  const user = await currentUser(
    new Request(request.url, { headers: { Cookie: `lifenum_session=${token}` } }),
    env,
  );

  if (request.headers.get('X-Client-Platform') === 'native') {
    return json({ user, token });
  }
  return json({ user }, 200, { 'Set-Cookie': sessionCookie(request, token) });
};
