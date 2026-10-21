import {
  appUrl,
  ensureStripePrice,
  fail,
  getSettings,
  json,
  requireUser,
  stripeRequest,
  type Ctx,
} from '../lib/api';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'POST') return fail('METHOD_NOT_ALLOWED', 405);

  const user = await requireUser(request, env);
  if (user instanceof Response) return user;

  try {
    const settings = await getSettings(env);
    const base = await appUrl(request, env);
    const priceId = await ensureStripePrice(env, settings);
    const session = await stripeRequest(env, 'POST', '/checkout/sessions', {
      mode: 'subscription',
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${base}/?checkout=success`,
      cancel_url: `${base}/?checkout=cancel`,
      allow_promotion_codes: 'true',
      subscription_data: { metadata: { user_id: user.id } },
      metadata: { user_id: user.id },
    });
    return json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'CHECKOUT_FAILED';
    console.error('checkout failed', message);
    return fail(message === 'STRIPE_NOT_CONFIGURED' ? 'STRIPE_NOT_CONFIGURED' : 'CHECKOUT_FAILED', 503);
  }
};
