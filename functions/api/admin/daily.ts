import { fail, json, readBody, requireAdmin, type Ctx } from '../../lib/api';
import {
  deleteDailyEntry,
  isValidDate,
  recentDailyEntries,
  readDailyEntry,
  sanitizeEntry,
  saveDailyEntry,
} from '../../lib/daily';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  const url = new URL(request.url);
  const date = url.searchParams.get('date');

  if (request.method === 'GET') {
    if (date) {
      if (!isValidDate(date)) return fail('INVALID_INPUT', 422);
      return json({ entry: await readDailyEntry(env, date, true) });
    }
    return json({ entries: await recentDailyEntries(env, 20) });
  }

  if (request.method === 'PUT') {
    const entry = sanitizeEntry(await readBody<Record<string, unknown>>(request));
    if (!entry) return fail('INVALID_INPUT', 422);
    return json({ entry: await saveDailyEntry(env, entry) });
  }

  if (request.method === 'DELETE') {
    if (!isValidDate(date)) return fail('INVALID_INPUT', 422);
    await deleteDailyEntry(env, date);
    return json({ ok: true });
  }

  return fail('METHOD_NOT_ALLOWED', 405);
};
