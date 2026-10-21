import {
  CURRENCIES,
  fail,
  getSettings,
  json,
  readBody,
  requireAdmin,
  setSetting,
  type Ctx,
  type Settings,
} from '../../lib/api';

function payload(settings: Settings, stripeConfigured: boolean) {
  return {
    priceCents: settings.priceCents,
    currency: settings.currency,
    stripeConfigured,
  };
}

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === 'GET') {
    return json(payload(await getSettings(env), Boolean(env.STRIPE_SECRET_KEY)));
  }

  if (request.method === 'PUT') {
    const { price, currency } = await readBody<{ price?: number; currency?: string }>(request);
    const amount = Number(price);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000) {
      return fail('INVALID_INPUT', 422);
    }
    const nextCurrency = (currency ?? '').toUpperCase();
    if (!CURRENCIES.includes(nextCurrency)) return fail('INVALID_INPUT', 422);

    await setSetting(env, 'price_cents', String(Math.round(amount * 100)));
    await setSetting(env, 'currency', nextCurrency);
    await env.DB.prepare(
      "DELETE FROM settings WHERE key IN ('stripe_price_id','stripe_price_amount','stripe_price_currency')",
    ).run();

    return json(payload(await getSettings(env), Boolean(env.STRIPE_SECRET_KEY)));
  }

  return fail('METHOD_NOT_ALLOWED', 405);
};
