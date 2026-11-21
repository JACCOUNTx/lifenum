import { fail, json, readBody, requireAdmin, type Ctx } from '../../lib/api';
import { readAppConfig, saveAppConfig } from '../../lib/appConfig';

export const onRequest = async ({ request, env }: Ctx): Promise<Response> => {
  const admin = await requireAdmin(request, env);
  if (admin instanceof Response) return admin;

  if (request.method === 'GET') {
    return json(await readAppConfig(env));
  }

  if (request.method === 'PUT') {
    const body = await readBody<Record<string, unknown>>(request);
    if (!body || typeof body !== 'object') return fail('INVALID_INPUT', 422);
    try {
      return json(await saveAppConfig(env, body));
    } catch (error) {
      if (error instanceof Error && error.message === 'TOO_LARGE') {
        return fail('PAYLOAD_TOO_LARGE', 413);
      }
      return fail('SAVE_FAILED', 500);
    }
  }

  return fail('METHOD_NOT_ALLOWED', 405);
};
