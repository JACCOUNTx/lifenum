import {
  fail,
  getUserById,
  json,
  readBody,
  requireAdmin,
  type Ctx,
} from '../../lib/api';

interface AdminUserRow {
  id: string;
  email: string;
  name: string | null;
  birth_date: string | null;
  role: string;
  created_at: string;
  status: string | null;
  current_period_end: number | null;
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      `SELECT u.id, u.email, u.name, u.birth_date, u.role, u.created_at,
              s.status, s.current_period_end
         FROM users u
         LEFT JOIN subscriptions s ON s.user_id = u.id
        ORDER BY u.created_at DESC`,
    ).all<AdminUserRow>();
    return json({ users: result.results });
  }

  if (request.method === 'POST') {
    const { userId, active } = await readBody<{ userId?: string; active?: boolean }>(request);
    if (!userId) return fail('INVALID_INPUT', 422);

    const target = await getUserById(env, userId);
    if (!target) return fail('NOT_FOUND', 404);

    const now = Math.floor(Date.now() / 1000);
    const end = active ? now + 60 * 60 * 24 * 30 : now;
    await env.DB.prepare(
      `INSERT INTO subscriptions (user_id, status, stripe_customer_id, stripe_subscription_id, current_period_end, updated_at)
       VALUES (?, ?, NULL, NULL, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
         status = excluded.status,
         current_period_end = excluded.current_period_end,
         updated_at = excluded.updated_at`,
    )
      .bind(userId, active ? 'active' : 'canceled', end, new Date().toISOString())
      .run();

    return json({ user: await getUserById(env, userId) });
  }

  return fail('METHOD_NOT_ALLOWED', 405);
};
