import {
  createSession,
  fail,
  hashPassword,
  json,
  readBody,
  sessionCookie,
  toSessionUser,
  type Ctx,
} from '../../lib/api';

interface Input {
  email?: string;
  password?: string;
  name?: string;
  birthDate?: string;
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const { email, password, name, birthDate } = await readBody<Input>(request);
  const normalizedEmail = (email ?? '').trim().toLowerCase();
  const normalizedName = (name ?? '').trim();
  const normalizedBirth = (birthDate ?? '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return fail('INVALID_INPUT', 422);
  if ((password ?? '').length < 8) return fail('INVALID_INPUT', 422);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedBirth)) return fail('INVALID_INPUT', 422);

  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?')
    .bind(normalizedEmail)
    .first();
  if (existing) return fail('EMAIL_EXISTS', 409);

  const id = crypto.randomUUID();
  const role =
    env.ADMIN_EMAIL && normalizedEmail === env.ADMIN_EMAIL.trim().toLowerCase() ? 'admin' : 'member';
  const passwordHash = await hashPassword(password ?? '');

  await env.DB.prepare(
    `INSERT INTO users (id, email, password_hash, name, birth_date, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, normalizedEmail, passwordHash, normalizedName || null, normalizedBirth, role, new Date().toISOString())
    .run();

  const token = await createSession(env, id);
  const user = toSessionUser({
    id,
    email: normalizedEmail,
    name: normalizedName || null,
    birth_date: normalizedBirth,
    role,
    sub_status: null,
    sub_end: null,
  });

  if (request.headers.get('X-Client-Platform') === 'native') {
    return json({ user, token }, 201);
  }
  return json({ user }, 201, { 'Set-Cookie': sessionCookie(request, token) });
};
