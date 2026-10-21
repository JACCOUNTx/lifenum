import {
  fail,
  json,
  upsertStoreSubscription,
  type Ctx,
} from '../../lib/api';

const ACTIVE_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'TEMPORARY_ENTITLEMENT_GRANT',
  'SUBSCRIPTION_EXTENDED',
]);

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const token = env.REVENUECAT_WEBHOOK_TOKEN?.trim();
  if (!token) return fail('WEBHOOK_NOT_CONFIGURED', 503);
  if (request.headers.get('Authorization') !== `Bearer ${token}`) {
    return fail('UNAUTHORIZED', 401);
  }

  let body: Record<string, any>;
  try {
    body = (await request.json()) as Record<string, any>;
  } catch {
    return fail('INVALID_PAYLOAD', 400);
  }

  const event = (body?.event ?? {}) as Record<string, any>;
  const userId = typeof event.app_user_id === 'string' ? event.app_user_id : '';
  const type = typeof event.type === 'string' ? event.type : '';
  if (!userId || !type) return fail('INVALID_PAYLOAD', 400);

  const end =
    Number(event.expiration_at_ms) > 0
      ? Math.floor(Number(event.expiration_at_ms) / 1000)
      : null;
  const now = Math.floor(Date.now() / 1000);

  try {
    if (ACTIVE_EVENTS.has(type)) {
      await upsertStoreSubscription(env, userId, 'active', end);
    } else if (type === 'CANCELLATION') {
      await upsertStoreSubscription(env, userId, end && end > now ? 'active' : 'canceled', end);
    } else if (type === 'EXPIRATION') {
      await upsertStoreSubscription(env, userId, 'expired', end);
    } else if (type === 'BILLING_ISSUE') {
      await upsertStoreSubscription(env, userId, 'past_due', end);
    }
    return json({ received: true });
  } catch {
    return fail('WEBHOOK_FAILED', 500);
  }
};
