import {
  appUrl,
  ensurePortalConfig,
  fail,
  json,
  requireUser,
  stripeRequest,
  type Ctx,
} from '../lib/api';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  const row = await env.DB.prepare('SELECT stripe_customer_id FROM subscriptions WHERE user_id = ?')
    .bind(user.id)
    .first<{ stripe_customer_id: string | null }>();
  if (!row?.stripe_customer_id) return fail('NO_SUBSCRIPTION', 400);

  try {
    const base = await appUrl(request, env);
    const configuration = await ensurePortalConfig(env, base);
    const session = await stripeRequest(env, 'POST', '/billing_portal/sessions', {
      customer: row.stripe_customer_id,
      return_url: base,
      configuration,
    });
    return json({ url: session.url });
  } catch {
    return fail('PORTAL_FAILED', 503);
  }
};
