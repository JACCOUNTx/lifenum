import {
  fail,
  json,
  stripeRequest,
  upsertSubscription,
  verifyStripeSignature,
  type Ctx,
} from '../../lib/api';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);
  if (!env.STRIPE_WEBHOOK_SECRET) return fail('WEBHOOK_NOT_CONFIGURED', 503);
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET.trim();

  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');
  if (!(await verifyStripeSignature(payload, signature, webhookSecret))) {
    return fail('INVALID_SIGNATURE', 400);
  }

  let event: Record<string, any>;
  try {
    event = JSON.parse(payload) as Record<string, any>;
  } catch {
    return fail('INVALID_PAYLOAD', 400);
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data?.object ?? {};
      if (session.subscription) {
        const subscription = await stripeRequest(
          env,
          'GET',
          `/subscriptions/${session.subscription}`,
        );
        await upsertSubscription(env, subscription, session.client_reference_id);
      }
    } else if (
      event.type === 'customer.subscription.created' ||
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    ) {
      await upsertSubscription(env, event.data?.object ?? {});
    }
    return json({ received: true });
  } catch {
    return fail('WEBHOOK_FAILED', 500);
  }
};
