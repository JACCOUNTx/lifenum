import { fail, json, type Ctx } from '../lib/api';
import { isValidDate, listDailyEntries, readDailyEntry } from '../lib/daily';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  if (request.method !== 'GET') return fail('METHOD_NOT_ALLOWED', 405);

  const url = new URL(request.url);
  const date = url.searchParams.get('date');
  const days = Number(url.searchParams.get('days') ?? '0');
  const headers = { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' };

  if (date) {
    if (!isValidDate(date)) return fail('INVALID_INPUT', 422);
    const entry = await readDailyEntry(env, date, false);
    if (!entry) return json({ entry: null }, 200, headers);
    if (days > 1) {
      const entries = await listDailyEntries(env, date, days, false);
      return json({ entry, entries }, 200, headers);
    }
    return json({ entry }, 200, headers);
  }

  const from = new Date().toISOString().slice(0, 10);
  const entries = await listDailyEntries(env, from, days > 0 ? days : 7, false);
  return json({ entries }, 200, headers);
};
