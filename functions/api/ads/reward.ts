import { fail, getUserById, json, requireUser, type Ctx } from '../../lib/api';

const DAY_SECONDS = 60 * 60 * 24;

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare('SELECT vip_expires_at FROM users WHERE id = ?')
    .bind(user.id)
    .first<{ vip_expires_at: number | null }>();

  // 仲有超過 24 小時存貨就唔再疊加，避免無限刷廣告累積權限。
  const current = row?.vip_expires_at ?? 0;
  if (current > now + DAY_SECONDS) return fail('TOO_SOON', 429);

  const next = Math.max(now, current) + DAY_SECONDS;
  await env.DB.prepare('UPDATE users SET vip_expires_at = ? WHERE id = ?')
    .bind(next, user.id)
    .run();

  return json({ user: await getUserById(env, user.id), vipExpiresAt: next });
};
