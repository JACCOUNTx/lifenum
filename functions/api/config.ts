import { fail, getSettings, json, type Ctx } from '../lib/api';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405);
  const settings = await getSettings(env);
  return json({
    priceCents: settings.priceCents,
    currency: settings.currency,
    stripeConfigured: Boolean(env.STRIPE_SECRET_KEY),
  });
};
